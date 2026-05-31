/* ============================================
   UI.JS - Renderizado y Librería de Mobiliario
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const state = new AppState();
    const calculator = new SpaceCalculator(state);

    const viewport = document.querySelector('.viewport');
    const gondola3d = document.getElementById('gondola-3d');
    const catalogList = document.getElementById('catalog-list');
    const catalogSearch = document.getElementById('catalog-search');
    const libraryList = document.getElementById('library-list');
    
    const inputs = {
        type: document.getElementById('input-type'),
        width: document.getElementById('input-width'),
        height: document.getElementById('input-height'),
        depth: document.getElementById('input-depth'),
        numShelves: document.getElementById('input-num-shelves'),
        gap: document.getElementById('input-gap'),
        baseHeight: document.getElementById('input-base-height'),
        autoPack: document.getElementById('input-autopack')
    };

    const stats = {
        value: document.getElementById('stat-total-value'),
        units: document.getElementById('stat-total-units'),
        skus: document.getElementById('stat-total-skus')
    };

    // --- Login & Store Flow ---
    const loginScreen = document.getElementById('login-screen');
    const storeSelectorScreen = document.getElementById('store-selector-screen');
    const mainApp = document.getElementById('main-app');

    const authKey = 'planogram_logged_in';
    const screenKey = 'planogram_screen';
    const storeKey = 'planogram_store_id';
    const gondolaKey = 'planogram_gondola_id';

    const setScreenState = (screen) => {
        localStorage.setItem(screenKey, screen);
    };

    const setStoreState = (storeId) => {
        if (storeId) localStorage.setItem(storeKey, storeId);
    };

    const setGondolaState = (gondolaId) => {
        if (gondolaId) localStorage.setItem(gondolaKey, gondolaId);
    };

    const showStoreSelector = () => {
        loginScreen.style.display = 'none';
        document.getElementById('store-details-screen').style.display = 'none';
        mainApp.style.display = 'none';
        storeSelectorScreen.style.display = 'flex';
        
        const inlineReport = document.getElementById('inline-report-section');
        if (inlineReport) inlineReport.style.display = 'none';
        
        setScreenState('store-selector');
        renderStoreList();
    };

    const showStoreDetails = () => {
        loginScreen.style.display = 'none';
        storeSelectorScreen.style.display = 'none';
        mainApp.style.display = 'none';
        document.getElementById('store-details-screen').style.display = 'block';
        
        const detailsReport = document.getElementById('details-report-section');
        if (detailsReport) detailsReport.style.display = 'none';
        
        setScreenState('store-details');
        renderStoreDetails();
    };

    const showMainApp = () => {
        loginScreen.style.display = 'none';
        storeSelectorScreen.style.display = 'none';
        document.getElementById('store-details-screen').style.display = 'none';
        mainApp.style.display = 'grid';
        setScreenState('main-app');
        initAppContent();
    };

    const canDropProduct = (shelfIndex, productId) => {
        if (!productId) return false;
        const product = state.getProductById(productId);
        if (!product) return false;
        const shelf = state.gondola.shelves[shelfIndex];
        if (!shelf) return false;

        const usableHeight = state.getShelfUsableHeight(shelfIndex);
        if (product.height > usableHeight) return false;

        if (shelf.type === 'perchero') {
            const spacing = shelf.hookSpacing || 15;
            const numHooks = Math.floor(state.gondola.shelfWidth / spacing);
            if (shelf.products.length >= numHooks) return false;
            if (product.width > state.gondola.shelfWidth) return false;
        } else {
            const requiredWidth = product.width;
            const availableWidth = state.getShelfAvailableWidth(shelfIndex);
            if (requiredWidth > availableWidth) return false;
        }

        return true;
    };

    function init() {
        setupEventListeners();
        setupLoginAndStores();
    }

    function setupLoginAndStores() {
        const loginError = document.getElementById('login-error');

        const restoreSession = () => {
            const authActive = localStorage.getItem(authKey) === 'true';
            const savedStore = localStorage.getItem(storeKey);
            const savedGondola = localStorage.getItem(gondolaKey);
            const savedScreen = localStorage.getItem(screenKey);

            if (!authActive) return;

            if (savedStore && state.stores.some(s => s.id === savedStore)) {
                state.selectStore(savedStore);
            }

            if (savedGondola && state.library.some(p => p.id === savedGondola)) {
                state.loadGondola(savedGondola);
            }

            if (savedScreen === 'main-app' && state.currentGondolaId) {
                showMainApp();
                return;
            }

            if (savedScreen === 'store-details' && state.currentStoreId) {
                showStoreDetails();
                return;
            }

            showStoreSelector();
        };

        const checkLogin = () => {
            const user = document.getElementById('login-username').value.trim().toLowerCase();
            const pass = document.getElementById('login-password').value.trim();
            loginError.style.display = 'none';

            const validUser = user === 'admin';
            const validPass = pass.toLowerCase() === 'admin123';

            if (validUser && validPass) {
                localStorage.setItem(authKey, 'true');
                restoreSession();
            } else {
                loginError.style.display = 'block';
            }
        };

        document.getElementById('btn-login').addEventListener('click', checkLogin);
        document.getElementById('login-password').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                checkLogin();
            }
        });
        document.getElementById('login-username').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                checkLogin();
            }
        });

        if (localStorage.getItem(authKey) === 'true') {
            restoreSession();
        }

        const createStoreForm = document.getElementById('create-store-form');
        document.getElementById('btn-show-create-store').addEventListener('click', () => {
            createStoreForm.style.display = 'flex';
        });
        document.getElementById('btn-cancel-create-store').addEventListener('click', () => {
            createStoreForm.style.display = 'none';
            document.getElementById('new-store-name').value = '';
            document.getElementById('new-store-custom-id').value = '';
        });
        document.getElementById('btn-close-store-modal-x').addEventListener('click', () => {
            createStoreForm.style.display = 'none';
            document.getElementById('new-store-name').value = '';
            document.getElementById('new-store-custom-id').value = '';
        });

        const editStoreForm = document.getElementById('edit-store-form');
        document.getElementById('btn-cancel-edit-store').addEventListener('click', () => {
            editStoreForm.style.display = 'none';
            document.getElementById('edit-store-name').value = '';
            document.getElementById('edit-store-custom-id').value = '';
        });
        document.getElementById('btn-close-edit-store-modal-x').addEventListener('click', () => {
            editStoreForm.style.display = 'none';
            document.getElementById('edit-store-name').value = '';
            document.getElementById('edit-store-custom-id').value = '';
        });
        document.getElementById('btn-save-store').addEventListener('click', () => {
            const storeId = editStoreForm.dataset.storeId;
            const newName = document.getElementById('edit-store-name').value.trim();
            const newCustomId = document.getElementById('edit-store-custom-id').value.trim();
            
            if (newName && newCustomId) {
                const newId = 'store-' + newCustomId;
                const result = state.updateStoreDetails(storeId, newName, newId);
                if (result.success) {
                    editStoreForm.style.display = 'none';
                    renderStoreList();
                } else {
                    alert(result.reason);
                }
            } else {
                alert('El nombre y el ID son requeridos.');
            }
        });

        const deleteConfirmModal = document.getElementById('delete-store-confirm-modal');
        document.getElementById('btn-cancel-delete-modal').addEventListener('click', () => {
            deleteConfirmModal.style.display = 'none';
        });
        document.getElementById('btn-close-delete-modal-x').addEventListener('click', () => {
            deleteConfirmModal.style.display = 'none';
        });
        document.getElementById('btn-confirm-delete-store').addEventListener('click', () => {
            const storeId = deleteConfirmModal.dataset.storeId;
            if (storeId) {
                state.deleteStore(storeId);
                deleteConfirmModal.style.display = 'none';
                renderStoreList();
            }
        });

        const emptyGondolaConfirmModal = document.getElementById('empty-gondola-confirm-modal');
        const btnEmpty = document.getElementById('btn-empty-gondola');
        if (btnEmpty) {
            btnEmpty.addEventListener('click', () => {
                emptyGondolaConfirmModal.style.display = 'flex';
            });
        }
        document.getElementById('btn-cancel-empty-modal').addEventListener('click', () => {
            emptyGondolaConfirmModal.style.display = 'none';
        });
        document.getElementById('btn-close-empty-modal-x').addEventListener('click', () => {
            emptyGondolaConfirmModal.style.display = 'none';
        });
        document.getElementById('btn-confirm-empty-gondola').addEventListener('click', () => {
            state.emptyGondola();
            emptyGondolaConfirmModal.style.display = 'none';
        });
        emptyGondolaConfirmModal.addEventListener('click', (e) => {
            if (e.target === emptyGondolaConfirmModal) {
                emptyGondolaConfirmModal.style.display = 'none';
            }
        });

        document.getElementById('btn-back-stores').addEventListener('click', () => {
            mainApp.style.display = 'none';
            document.getElementById('store-details-screen').style.display = 'block';
            setScreenState('store-details');
            renderStoreDetails();
        });

        document.getElementById('btn-back-to-stores-list').addEventListener('click', () => {
            showStoreSelector();
        });

        const createGondolaModal = document.getElementById('create-gondola-modal');
        const editGondolaModal = document.getElementById('edit-gondola-modal');

        document.getElementById('btn-create-gondola').addEventListener('click', () => {
            document.getElementById('new-gondola-name').value = 'Nueva Góndola';
            document.getElementById('new-gondola-aisle').value = '';
            createGondolaModal.style.display = 'flex';
            document.getElementById('new-gondola-name').focus();
        });

        document.getElementById('btn-close-gondola-modal-x').addEventListener('click', () => {
            createGondolaModal.style.display = 'none';
        });

        document.getElementById('btn-cancel-create-gondola').addEventListener('click', () => {
            createGondolaModal.style.display = 'none';
        });

        document.getElementById('btn-confirm-create-gondola').addEventListener('click', () => {
            const name = document.getElementById('new-gondola-name').value.trim();
            const aisle = document.getElementById('new-gondola-aisle').value.trim();
            if (name) {
                const newId = state.createNewGondola(name, aisle);
                createGondolaModal.style.display = 'none';
                setStoreState(state.currentStoreId);
                setGondolaState(newId);
                showMainApp();
            } else {
                alert('El nombre de la góndola es obligatorio.');
            }
        });

        document.getElementById('btn-close-edit-gondola-modal-x').addEventListener('click', () => {
            editGondolaModal.style.display = 'none';
        });

        document.getElementById('btn-cancel-edit-gondola').addEventListener('click', () => {
            editGondolaModal.style.display = 'none';
        });

        document.getElementById('btn-save-gondola').addEventListener('click', () => {
            const id = editGondolaModal.dataset.gondolaId;
            const name = document.getElementById('edit-gondola-name').value.trim();
            const aisle = document.getElementById('edit-gondola-aisle').value.trim();
            if (name && id) {
                state.renameGondola(id, name, aisle);
                editGondolaModal.style.display = 'none';
                renderStoreDetails();
            } else {
                alert('El nombre de la góndola es obligatorio.');
            }
        });

        document.getElementById('btn-global-report').addEventListener('click', () => {
            const store = state.stores.find(s => s.id === state.currentStoreId);
            if (store) {
                generateStoreDetailsGlobalReport(store);
            }
        });

        document.getElementById('btn-create-store').addEventListener('click', () => {
            const name = document.getElementById('new-store-name').value.trim();
            const customId = document.getElementById('new-store-custom-id').value.trim();
            if (name) {
                state.createStore(name, customId);
                createStoreForm.style.display = 'none';
                document.getElementById('new-store-name').value = '';
                document.getElementById('new-store-custom-id').value = '';
                renderStoreList();
            }
        });

        const logoutAction = () => {
            localStorage.removeItem('planogram_logged_in');
            localStorage.removeItem('planogram_screen');
            localStorage.removeItem('planogram_store_id');
            localStorage.removeItem('planogram_gondola_id');
            storeSelectorScreen.style.display = 'none';
            document.getElementById('store-details-screen').style.display = 'none';
            mainApp.style.display = 'none';
            loginScreen.style.display = 'flex';
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
        };

        document.getElementById('btn-logout-main').addEventListener('click', logoutAction);
        
        const logoutDetails = document.getElementById('btn-logout-details');
        if (logoutDetails) {
            logoutDetails.addEventListener('click', logoutAction);
        }
        
        const logoutApp = document.getElementById('btn-logout-app');
        if (logoutApp) {
            logoutApp.addEventListener('click', logoutAction);
        }
    }

    function renderStoreList() {
        const storeList = document.getElementById('store-list');
        storeList.innerHTML = '';
        if (state.stores.length === 0) {
            storeList.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align:center; padding: 40px;">No hay tiendas creadas. Crea una para comenzar.</p>';
            return;
        }

        state.stores.forEach(s => {
            const el = document.createElement('div');
            el.className = 'store-card';
            const date = new Date(s.createdAt).toLocaleDateString();
            const presetsCount = s.library ? s.library.length : 0;

            // Count total units across all gondolas for this store
            let storeTotalUnits = 0;
            if (s.library) {
                s.library.forEach(g => {
                    if (!g || !g.config || !g.config.shelves) return;
                    g.config.shelves.forEach(shelf => {
                        if (!shelf || !shelf.products) return;
                        shelf.products.forEach(p => {
                            if (!p) return;
                            let layersToProcess = p.layers;
                            if (!layersToProcess && p.productId) {
                                layersToProcess = [];
                                for (let i = 0; i < (p.stacks || 1); i++) {
                                    layersToProcess.push({ productId: p.productId, facings: p.facings || 1, orientation: p.orientation || 0 });
                                }
                            }
                            if (layersToProcess) {
                                layersToProcess.forEach(layer => {
                                    if (!layer || !layer.productId) return;
                                    const product = state.getProductById(layer.productId);
                                    if (product) {
                                        const dims = state.getPlacedDimensions(layer.productId, layer.orientation || 0);
                                        if (dims && dims.depth > 0) {
                                            storeTotalUnits += (layer.facings || 1) * Math.floor(g.config.shelfDepth / dims.depth);
                                        }
                                    }
                                });
                            }
                        });
                    });
                });
            }

            el.innerHTML = `
                <div class="store-card-content">
                    <div class="store-card-header">
                        <div class="store-card-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9"/><path d="M9 22V12h6v10M2 10.6L12 2l10 8.6"/></svg>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                                <h3 style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${s.name}</h3>
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <button class="btn-edit-store" title="Editar tienda" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:2px; display:inline-flex; align-items:center; transition:color 0.2s;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                    <button class="btn-delete-store-icon" title="Eliminar tienda" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:2px; display:inline-flex; align-items:center; transition:color 0.2s;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <p>${presetsCount} góndola${presetsCount !== 1 ? 's' : ''} · ${storeTotalUnits} unidades</p>
                        </div>
                    </div>
                    <div class="meta">
                        <span class="pill-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${date}</span>
                        <span class="pill-badge">ID: ${(s.id.split('-')[1] || s.id).slice(0, 6)}</span>
                    </div>
                    <div class="store-card-actions">
                        <button class="btn-store-report" data-store-id="${s.id}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                            Reporte
                        </button>
                        <button class="btn-enter-store" data-store-id="${s.id}">
                            Gestionar →
                        </button>
                    </div>
                </div>
            `;
            
            el.querySelector('.btn-enter-store').addEventListener('click', (e) => {
                e.stopPropagation();
                state.selectStore(s.id);
                setStoreState(s.id);
                setScreenState('store-details');
                document.getElementById('details-store-name').innerText = s.name;
                document.getElementById('header-store-name').innerText = '- ' + s.name;
                storeSelectorScreen.style.display = 'none';
                document.getElementById('store-details-screen').style.display = 'block';
                renderStoreDetails();
            });

            el.querySelector('.btn-edit-store').addEventListener('click', (e) => {
                e.stopPropagation();
                const editModal = document.getElementById('edit-store-form');
                const nameInput = document.getElementById('edit-store-name');
                const idInput = document.getElementById('edit-store-custom-id');
                
                nameInput.value = s.name;
                idInput.value = s.id.replace('store-', '');
                editModal.dataset.storeId = s.id;
                
                editModal.style.display = 'flex';
            });

            el.querySelector('.btn-delete-store-icon').addEventListener('click', (e) => {
                e.stopPropagation();
                const deleteModal = document.getElementById('delete-store-confirm-modal');
                document.getElementById('delete-modal-store-name').innerText = s.name;
                deleteModal.dataset.storeId = s.id;
                deleteModal.style.display = 'flex';
            });

            el.querySelector('.btn-store-report').addEventListener('click', (e) => {
                e.stopPropagation();
                state.selectStore(s.id);
                const freshStore = state.stores.find(x => x.id === s.id);
                generateInlineReport(freshStore || s);
            });

            storeList.appendChild(el);
        });
    }

    function renderStoreDetails() {
        const gondolaList = document.getElementById('gondola-list');
        gondolaList.innerHTML = '';
        const store = state.stores.find(s => s.id === state.currentStoreId);
        
        if (!store || !store.library || store.library.length === 0) {
            gondolaList.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align:center; padding: 40px;">No hay góndolas en esta tienda. Crea una nueva.</p>';
            return;
        }

        // Agrupar góndolas por pasillo
        const groups = {};
        let hasAisles = false;
        store.library.forEach(g => {
            const aisle = (g.aisle || '').trim();
            if (aisle !== '') {
                hasAisles = true;
            }
            if (!groups[aisle]) {
                groups[aisle] = [];
            }
            groups[aisle].push(g);
        });

        // Ordenar pasillos: alfabéticamente primero, y el pasillo vacío ("") al final
        const sortedAisles = Object.keys(groups).sort((a, b) => {
            if (a === '') return 1;
            if (b === '') return -1;
            return a.localeCompare(b);
        });

        sortedAisles.forEach(aisle => {
            const gondolasInAisle = groups[aisle];
            if (gondolasInAisle.length === 0) return;

            // Si hay al menos un pasillo registrado en la tienda, renderizamos la cabecera del grupo
            if (hasAisles) {
                const headerEl = document.createElement('div');
                headerEl.className = 'aisle-header';
                headerEl.style.gridColumn = '1 / -1';
                headerEl.style.marginTop = '28px';
                headerEl.style.marginBottom = '12px';
                headerEl.style.display = 'flex';
                headerEl.style.alignItems = 'center';
                headerEl.style.gap = '10px';

                const badgeText = aisle === '' ? 'General' : 'Pasillo';
                const aisleTitle = aisle === '' ? 'Sin pasillo asignado' : aisle;
                const badgeBg = aisle === '' ? 'rgba(100, 116, 139, 0.1)' : 'rgba(0, 150, 57, 0.1)';
                const badgeColor = aisle === '' ? 'var(--text-muted)' : 'var(--primary)';

                headerEl.innerHTML = `
                    <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">${badgeText}</span>
                    <h3 style="margin: 0; font-size: 17px; font-weight: 700; color: var(--text);">${aisleTitle}</h3>
                    <span style="color: var(--text-muted); font-size: 12px; font-weight: 500;">(${gondolasInAisle.length} góndola${gondolasInAisle.length !== 1 ? 's' : ''})</span>
                `;
                gondolaList.appendChild(headerEl);
            }

            gondolasInAisle.forEach(g => {
                const el = document.createElement('div');
                el.className = 'store-card';
                
                // Calculate total units in this gondola for a quick stat
                let totalUnits = 0;
                if (g.config && g.config.shelves) {
                    g.config.shelves.forEach(shelf => {
                        if (!shelf || !shelf.products) return;
                        shelf.products.forEach(p => {
                            if (!p) return;
                            let layersToProcess = p.layers;
                            if (!layersToProcess && p.productId) {
                                layersToProcess = [];
                                for (let i = 0; i < (p.stacks || 1); i++) {
                                    layersToProcess.push({ productId: p.productId, facings: p.facings || 1, orientation: p.orientation || 0 });
                                }
                            }
                            if (layersToProcess) {
                                layersToProcess.forEach(layer => {
                                    if (!layer || !layer.productId) return;
                                    const product = state.getProductById(layer.productId);
                                    if (product) {
                                        const dims = state.getPlacedDimensions(layer.productId, layer.orientation || 0);
                                        if (dims && dims.depth > 0) {
                                            totalUnits += (layer.facings || 1) * Math.floor(g.config.shelfDepth / dims.depth);
                                        }
                                    }
                                });
                            }
                        });
                    });
                }

                let typeLabel = g.config.type === 'pared' ? 'Góndola Pared' : g.config.type === 'central' ? 'Góndola Central' : g.config.type === 'cabecera' ? 'Cabecera' : 'Refrigerado';

                // Generate a mini 3D preview
                const maxMiniH = 75; // max height in pixels for the miniature
                const scaleMini = maxMiniH / 220; // Scale factor so a 220cm height maps to 75px
                const miniH = Math.max(35, g.config.height * scaleMini);
                const miniW = Math.max(25, g.config.width * scaleMini);
                const miniD = Math.max(8, g.config.depth * scaleMini);

                const typeColors = {
                    pared:       { back: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', shelf: '#475569', shelfTop: '#64748b', shelfFront: '#334155', border: '#334155' },
                    central:     { back: 'rgba(120,113,108,0.1)', shelf: '#78716c', shelfTop: '#a8a29e', shelfFront: '#57534e', border: '#78716c' },
                    cabecera:    { back: 'linear-gradient(180deg, #292524 0%, #1c1917 100%)', shelf: '#44403c', shelfTop: '#57534e', shelfFront: '#292524', border: '#57534e' },
                    refrigerado: { back: 'linear-gradient(180deg, #0c1929 0%, #0a1628 100%)', shelf: '#1e3a5f', shelfTop: '#2563eb', shelfFront: '#1e40af', border: '#3b82f6' }
                };
                const tc = typeColors[g.config.type] || typeColors.pared;
                const miniBg = tc.back;
                const miniBorder = tc.border;
                let glowStyle = '';

                if (g.config.type === 'refrigerado') {
                    glowStyle = 'box-shadow: inset 0 0 10px rgba(59,130,246,0.3);';
                }

                let colLHtml = '';
                let colRHtml = '';
                if (g.config.type === 'pared') {
                    colLHtml = `<div style="position:absolute; left:-2px; top:0; width:2px; height:100%; background:#334155; transform-style:preserve-3d;"><div style="position:absolute; left:0; width:${miniD}px; height:100%; background:#2d3a4a; transform:rotateY(90deg); transform-origin:left;"></div></div>`;
                    colRHtml = `<div style="position:absolute; right:-2px; top:0; width:2px; height:100%; background:#334155; transform-style:preserve-3d;"><div style="position:absolute; right:0; width:${miniD}px; height:100%; background:#2d3a4a; transform:rotateY(-90deg); transform-origin:right;"></div></div>`;
                } else if (g.config.type === 'central') {
                    colLHtml = `<div style="position:absolute; left:-2px; top:0; width:2px; height:100%; background:#78716c; transform-style:preserve-3d;"><div style="position:absolute; left:0; width:${miniD}px; height:100%; background:#57534e; transform:rotateY(90deg); transform-origin:left;"></div></div>`;
                    colRHtml = `<div style="position:absolute; right:-2px; top:0; width:2px; height:100%; background:#78716c; transform-style:preserve-3d;"><div style="position:absolute; right:0; width:${miniD}px; height:100%; background:#57534e; transform:rotateY(-90deg); transform-origin:right;"></div></div>`;
                } else if (g.config.type === 'refrigerado') {
                    colRHtml = `<div style="position:absolute; top:0; right:0; width:${miniD}px; height:100%; background:rgba(59,130,246,0.04); border-left:1px solid rgba(59,130,246,0.15); transform:rotateY(-90deg); transform-origin:right;"></div>`;
                }

                let shelvesHtml = '';
                g.config.shelves.forEach(shelf => {
                    const miniShelfY = shelf.y * scaleMini;
                    const miniShelfThickness = Math.max(1, g.config.shelfThickness * scaleMini);
                    const isPerchero = shelf.type === 'perchero';
                    const shelfColor = isPerchero ? '#475569' : tc.shelf;
                    const shelfTopColor = isPerchero ? '#64748b' : tc.shelfTop;
                    const shelfFrontColor = isPerchero ? '#334155' : tc.shelfFront;
                    const miniShelfDepth = (isPerchero ? 2 : g.config.shelfDepth) * scaleMini;

                    shelvesHtml += `
                        <div style="position: absolute; width: 100%; height: ${miniShelfThickness}px; bottom: ${miniShelfY}px; left: 0; background: ${shelfColor}; transform-style: preserve-3d;">
                            <div style="position: absolute; width: 100%; height: ${miniShelfDepth}px; background: ${shelfTopColor}; transform: rotateX(90deg); transform-origin: top; top: 0; left: 0;"></div>
                            <div style="position: absolute; width: 100%; height: 100%; background: ${shelfFrontColor}; transform: translateZ(${miniShelfDepth}px); top: 0; left: 0;"></div>
                        </div>
                    `;
                });

                el.innerHTML = `
                    <div class="store-card-content" style="display: flex; flex-direction: row; gap: 16px; align-items: center; padding: 16px;">
                        <!-- Mini 3D Viewport -->
                        <div class="mini-viewport" style="width: 80px; height: 100px; border-radius: 12px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; perspective: 250px; overflow: hidden; flex-shrink: 0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.03);">
                            <div class="mini-gondola" style="position: relative; width: ${miniW}px; height: ${miniH}px; transform-style: preserve-3d; transform: rotateX(-12deg) rotateY(-18deg); transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); margin-top: 10px;">
                                <!-- Back Panel -->
                                <div style="position: absolute; inset: 0; background: ${miniBg}; border: 1px solid ${miniBorder}; transform-style: preserve-3d; ${glowStyle}">
                                    ${colLHtml}
                                    ${colRHtml}
                                </div>
                                <!-- Shelves -->
                                ${shelvesHtml}
                            </div>
                        </div>
                        
                        <!-- Card Info -->
                        <div style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
                            <div>
                                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap: 6px;">
                                    <h3 style="margin-bottom:2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 15px; font-weight: 700; color: var(--text); flex: 1;" title="${g.name}">${g.name}</h3>
                                    <div style="display: flex; align-items: center; gap: 4px;">
                                        <button class="btn-edit-gondola-name" title="Editar góndola" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:2px; display:inline-flex; align-items:center; transition:color 0.2s;">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                        <button class="btn-delete-gondola" data-id="${g.id}" style="background:rgba(239, 68, 68, 0.08); border:none; color:#ef4444; border-radius:6px; cursor:pointer; padding:5px; transition:all 0.2s; display:grid; place-items:center; flex-shrink:0;" title="Eliminar góndola">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                </div>
                                <p style="font-size:11px; color: var(--text-muted); font-weight: 600; margin-bottom: 8px;">${g.config.width}x${g.config.height}x${g.config.depth} cm</p>
                            </div>
                            <div class="meta" style="margin-bottom: 0; display:flex; gap:6px; flex-wrap: wrap;">
                                <span class="pill-badge" style="color: #10b981; background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.15); padding: 3px 6px; font-size: 10px; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                                    ${totalUnits} U.
                                </span>
                                <span class="pill-badge" style="color: var(--primary); background: var(--primary-light); border-color: rgba(0, 150, 57, 0.1); padding: 3px 6px; font-size: 10px; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center;">
                                    ${typeLabel}
                                </span>
                                ${g.aisle ? `
                                <span class="pill-badge" style="color: #6366f1; background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.15); padding: 3px 6px; font-size: 10px; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    ${g.aisle}
                                </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
                el.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-delete-gondola') || e.target.closest('.btn-edit-gondola-name')) return;
                    state.loadGondola(g.id);
                    setStoreState(state.currentStoreId);
                    setGondolaState(g.id);
                    showMainApp();
                });
                el.querySelector('.btn-edit-gondola-name').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const editModal = document.getElementById('edit-gondola-modal');
                    editModal.dataset.gondolaId = g.id;
                    document.getElementById('edit-gondola-name').value = g.name;
                    document.getElementById('edit-gondola-aisle').value = g.aisle || '';
                    editModal.style.display = 'flex';
                    document.getElementById('edit-gondola-name').focus();
                });
                el.querySelector('.btn-delete-gondola').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if(confirm('¿Seguro que deseas eliminar esta góndola?')) {
                        state.deleteGondola(g.id);
                        renderStoreDetails();
                    }
                });
                gondolaList.appendChild(el);
            });
        });
    }

    function updateDashboard() {
        const globalStats = calculator.getGlobalStats();
        if (stats.value) {
            stats.value.innerText = `$${globalStats.totalValue.toFixed(2)}`;
        }
        if (stats.units) {
            stats.units.innerText = globalStats.totalUnits.toString();
        }
        if (stats.skus) {
            stats.skus.innerText = globalStats.totalSKUs.toString();
        }
    }

    function initAppContent() {
        // Sync inputs to the current store's gondola
        Object.keys(inputs).forEach(key => {
            if (key === 'gap' && inputs[key]) inputs[key].value = state.gondola.gapBetweenShelves;
            else if (key === 'autoPack' && inputs[key]) inputs[key].checked = state.gondola.autoPack;
            else if (inputs[key]) inputs[key].value = state.gondola[key];
        });

        renderGondola();
        renderCatalog();
        updateDashboard();
    }


    function renderGondola() {
        const g = state.gondola;
        const scale = 3;

        const showDragCaret = (shelfEl, shelf, dragXcm) => {
            let caret = shelfEl.querySelector('.drag-caret');
            if (!caret) {
                caret = document.createElement('div');
                caret.className = 'drag-caret';
                caret.style.cssText = `position:absolute; top:0; width:4px; height:100%; background:var(--primary); box-shadow:0 0 8px var(--primary); z-index:100; transition:left 0.05s ease; pointer-events:none;`;
                shelfEl.appendChild(caret);
            }
            
            let caretXcm = 0;
            let insertIdx = 0;
            let currentAccumX = 0;
            
            if (shelf.products && shelf.products.length > 0) {
                let found = false;
                for (let i = 0; i < shelf.products.length; i++) {
                    const p = shelf.products[i];
                    let pWidth = 0;
                    if (p.layers && p.layers.length > 0) {
                        pWidth = state.getPlacedDimensions(p.layers[0].productId, p.layers[0].orientation || 0).width * p.layers[0].facings;
                    } else {
                        pWidth = state.getPlacedDimensions(p.productId, p.orientation || 0).width * (p.facings || 1);
                    }
                    
                    const midX = currentAccumX + pWidth / 2;
                    if (dragXcm < midX) {
                        caretXcm = currentAccumX;
                        insertIdx = i;
                        found = true;
                        break;
                    }
                    currentAccumX += pWidth;
                }
                if (!found) {
                    caretXcm = currentAccumX;
                    insertIdx = shelf.products.length;
                }
            }
            
            caret.style.left = `${caretXcm * scale}px`;
            caret.dataset.insertIndex = insertIdx.toString();
            caret.style.display = 'block';
        };

        const hideDragCaret = (shelfEl) => {
            const caret = shelfEl.querySelector('.drag-caret');
            if (caret) caret.style.display = 'none';
        };

        gondola3d.style.width = `${g.width * scale}px`;
        gondola3d.style.height = `${g.height * scale}px`;
        gondola3d.innerHTML = '';

        // === Type-specific visual structures ===
        const typeColors = {
            pared:       { back: '#1e293b', shelf: '#475569', shelfTop: '#64748b', shelfFront: '#334155', border: '#334155', accent: 'rgba(255,255,255,0.03)' },
            central:     { back: 'transparent', shelf: '#78716c', shelfTop: '#a8a29e', shelfFront: '#57534e', border: '#44403c', accent: 'rgba(168,162,158,0.08)' },
            cabecera:    { back: '#1c1917', shelf: '#44403c', shelfTop: '#57534e', shelfFront: '#292524', border: '#57534e', accent: 'rgba(251,146,60,0.05)' },
            refrigerado: { back: '#0c1929', shelf: '#1e3a5f', shelfTop: '#2563eb', shelfFront: '#1e40af', border: '#3b82f6', accent: 'rgba(59,130,246,0.06)' }
        };
        const tc = typeColors[g.type] || typeColors.pared;

        // Back Panel
        const backPanel = document.createElement('div');
        backPanel.className = 'gondola-back-panel';
        backPanel.style.width = '100%';
        backPanel.style.height = '100%';
        backPanel.style.position = 'absolute';
        backPanel.style.top = '0';
        backPanel.style.left = '0';

        if (g.type === 'pared') {
            backPanel.style.background = `linear-gradient(180deg, #1e293b 0%, #0f172a 100%)`;
            backPanel.style.borderLeft = `3px solid ${tc.border}`;
            backPanel.style.borderRight = `3px solid ${tc.border}`;
            backPanel.style.boxShadow = 'inset 0 0 60px rgba(0,0,0,0.4)';
            // Vertical columns
            const colL = document.createElement('div');
            colL.style.cssText = `position:absolute; left:-6px; top:0; width:6px; height:100%; background:#334155; transform-style:preserve-3d;`;
            const colLSide = document.createElement('div');
            colLSide.style.cssText = `position:absolute; left:0; width:${g.depth * scale}px; height:100%; background:#2d3a4a; transform:rotateY(-90deg); transform-origin:left;`;
            colL.appendChild(colLSide);
            gondola3d.appendChild(colL);

            const colR = document.createElement('div');
            colR.style.cssText = `position:absolute; right:-6px; top:0; width:6px; height:100%; background:#334155; transform-style:preserve-3d;`;
            const colRSide = document.createElement('div');
            colRSide.style.cssText = `position:absolute; right:0; width:${g.depth * scale}px; height:100%; background:#2d3a4a; transform:rotateY(90deg); transform-origin:right;`;
            colR.appendChild(colRSide);
            gondola3d.appendChild(colR);

        } else if (g.type === 'central') {
            backPanel.style.background = 'transparent';
            backPanel.style.borderLeft = `4px solid #78716c`;
            backPanel.style.borderRight = `4px solid #78716c`;
            // Metal posts at corners
            ['left:-8px', 'right:-8px'].forEach(pos => {
                const post = document.createElement('div');
                post.style.cssText = `position:absolute; ${pos}; top:0; width:8px; height:100%; background:linear-gradient(180deg, #a8a29e, #78716c); border-radius:2px; transform-style:preserve-3d;`;
                const postDepth = document.createElement('div');
                const isLeft = pos.startsWith('left');
                postDepth.style.cssText = `position:absolute; ${isLeft ? 'left:0' : 'right:0'}; width:${g.depth * scale}px; height:100%; background:#57534e; transform:rotateY(${isLeft ? '-' : ''}90deg); transform-origin:${isLeft ? 'left' : 'right'};`;
                post.appendChild(postDepth);
                gondola3d.appendChild(post);
            });

        } else if (g.type === 'cabecera') {
            backPanel.style.background = `linear-gradient(180deg, #292524 0%, #1c1917 100%)`;
            backPanel.style.border = `2px solid ${tc.border}`;
            backPanel.style.borderRadius = '4px';
            // Orange accent strip at top
            const accent = document.createElement('div');
            accent.style.cssText = `position:absolute; top:0; left:0; right:0; height:4px; background:linear-gradient(90deg, #f97316, #fb923c, #f97316); border-radius:2px 2px 0 0;`;
            backPanel.appendChild(accent);

        } else if (g.type === 'refrigerado') {
            backPanel.style.background = `linear-gradient(180deg, #0c1929 0%, #0a1628 100%)`;
            backPanel.style.border = `3px solid ${tc.border}`;
            backPanel.style.borderRadius = '6px';
            backPanel.style.boxShadow = `inset 0 0 80px rgba(59,130,246,0.08), 0 0 30px rgba(59,130,246,0.1)`;
            // Blue glow strip at top
            const glow = document.createElement('div');
            glow.style.cssText = `position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent);`;
            backPanel.appendChild(glow);
            // Glass side panel
            const glass = document.createElement('div');
            glass.style.cssText = `position:absolute; top:0; right:0; width:${g.depth * scale}px; height:100%; background:rgba(59,130,246,0.04); border:1px solid rgba(59,130,246,0.15); transform:rotateY(90deg); transform-origin:right; backdrop-filter:blur(2px);`;
            backPanel.appendChild(glass);
        }

        gondola3d.appendChild(backPanel);

        g.shelves.forEach((shelf, idx) => {
            const isPerchero = shelf.type === 'perchero';

            // If it is a perchero level, render a dotted pegboard panel on the back panel at this height
            if (isPerchero) {
                const usableH = state.getShelfUsableHeight(idx);
                const pegboard = document.createElement('div');
                pegboard.className = 'pegboard-panel';
                pegboard.style.cssText = `
                    position: absolute;
                    left: 0;
                    bottom: ${(shelf.y + g.shelfThickness) * scale}px;
                    width: 100%;
                    height: ${usableH * scale}px;
                    background: radial-gradient(rgba(255,255,255,0.15) 15%, transparent 15%) 0 0,
                                radial-gradient(rgba(255,255,255,0.15) 15%, transparent 15%) 8px 8px;
                    background-color: #1e293b;
                    background-size: 16px 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    transform: translateZ(0.5px);
                    transition: background-color 0.2s;
                `;
                
                // Add drag and drop listeners directly to the pegboard so it acts as a drop target too!
                pegboard.addEventListener('dragover', (e) => { 
                    e.preventDefault(); 
                    const productId = window.currentlyDraggedProductId;
                    if (productId && !canDropProduct(idx, productId)) {
                        pegboard.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                        pegboard.style.border = '2px dashed #ef4444';
                    } else {
                        pegboard.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
                        pegboard.style.border = '2px dashed #22c55e';
                    }
                });
                pegboard.addEventListener('dragleave', () => { 
                    pegboard.style.backgroundColor = '#1e293b'; 
                    pegboard.style.border = 'none';
                    pegboard.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                });
                pegboard.addEventListener('drop', (e) => {
                    e.preventDefault();
                    pegboard.style.backgroundColor = '#1e293b';
                    pegboard.style.border = 'none';
                    pegboard.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

                    const rect = pegboard.getBoundingClientRect();
                    const dropXpx = e.clientX - rect.left;
                    const dropXcm = (dropXpx / rect.width) * g.width;

                    const spacing = shelf.hookSpacing || 15;
                    const numHooks = Math.floor(g.width / spacing);
                    const margin = (g.width - (numHooks - 1) * spacing) / 2;

                    let closestHookIdx = 0;
                    let minDistance = Infinity;
                    for (let i = 0; i < numHooks; i++) {
                        const hookX = margin + i * spacing;
                        const dist = Math.abs(dropXcm - hookX);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestHookIdx = i;
                        }
                    }

                    const dragDataStr = e.dataTransfer.getData('application/json');
                    if (dragDataStr) {
                        const dragData = JSON.parse(dragDataStr);
                        const result = state.moveProduct(dragData.sourceShelfIndex, dragData.sourcePlacementIndex, idx, closestHookIdx, dragData.sourceLayerIndex);
                        if (!result.success) {
                            alert(result.reason);
                            renderGondola();
                        }
                    } else {
                        const productId = e.dataTransfer.getData('text/plain');
                        const result = state.placeProduct(idx, productId, 1, closestHookIdx);
                        if (!result.success) {
                            alert(result.reason);
                            renderGondola();
                        }
                    }
                });

                gondola3d.appendChild(pegboard);
            }

            const shelfEl = document.createElement('div');
            shelfEl.className = 'shelf-3d';
            shelfEl.style.width = `${g.width * scale}px`;
            shelfEl.style.height = `${(isPerchero ? 1 : g.shelfThickness) * scale}px`;
            shelfEl.style.bottom = `${shelf.y * scale}px`;
            shelfEl.style.left = '0px';
            shelfEl.style.transform = `translateZ(0px)`;
            shelfEl.style.background = isPerchero ? '#475569' : tc.shelf;
            shelfEl.style.borderColor = isPerchero ? '#334155' : `${tc.border}`;

            // Check for height or depth collision on this shelf
            const usableHeight = state.getShelfUsableHeight(idx);
            let hasHeightCollision = false;
            let hasDepthCollision = false;

            shelf.products.forEach(p => {
                let totalHeight = 0;
                let maxDepth = 0;
                if (p.layers && p.layers.length > 0) {
                    p.layers.forEach(layer => {
                        const dims = state.getPlacedDimensions(layer.productId, layer.orientation || 0);
                        totalHeight += dims.height;
                        maxDepth = Math.max(maxDepth, dims.depth);
                    });
                } else if (p.productId) {
                    const dims = state.getPlacedDimensions(p.productId, p.orientation || 0);
                    totalHeight = dims.height;
                    maxDepth = dims.depth;
                }
                
                if (totalHeight > usableHeight) {
                    hasHeightCollision = true;
                }
                if (maxDepth > g.shelfDepth) {
                    hasDepthCollision = true;
                }
            });

            if (hasHeightCollision || hasDepthCollision) {
                shelfEl.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.7)';
                shelfEl.style.animation = 'pulseError 1.5s infinite alternate';
                shelfEl.title = hasHeightCollision 
                    ? 'Advertencia: ¡Los productos exceden la altura disponible del estante!' 
                    : 'Advertencia: ¡Los productos sobresalen de la profundidad del estante!';
            }

            // Drag and Drop
            shelfEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                shelfEl.classList.add('drag-over');
                if (!isPerchero && g.autoPack) {
                    const rect = shelfEl.getBoundingClientRect();
                    const dragXpx = e.clientX - rect.left;
                    const dragXcm = (dragXpx / rect.width) * g.width;
                    showDragCaret(shelfEl, shelf, dragXcm);
                }
            });
            shelfEl.addEventListener('dragleave', () => {
                shelfEl.classList.remove('drag-over');
                hideDragCaret(shelfEl);
            });
            shelfEl.addEventListener('drop', (e) => {
                e.preventDefault();
                shelfEl.classList.remove('drag-over');
                hideDragCaret(shelfEl);

                let targetHookIndex = undefined;
                let targetX = undefined;
                let insertIndex = undefined;

                const rect = shelfEl.getBoundingClientRect();
                const dropXpx = e.clientX - rect.left;
                const dropXcm = (dropXpx / rect.width) * g.width;

                if (isPerchero) {
                    const spacing = shelf.hookSpacing || 15;
                    const numHooks = Math.floor(g.width / spacing);
                    const margin = (g.width - (numHooks - 1) * spacing) / 2;

                    let closestHookIdx = 0;
                    let minDistance = Infinity;
                    for (let i = 0; i < numHooks; i++) {
                        const hookX = margin + i * spacing;
                        const dist = Math.abs(dropXcm - hookX);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestHookIdx = i;
                        }
                    }
                    targetHookIndex = closestHookIdx;
                } else {
                    if (g.autoPack) {
                        const caret = shelfEl.querySelector('.drag-caret');
                        if (caret && caret.dataset.insertIndex !== undefined) {
                            insertIndex = parseInt(caret.dataset.insertIndex);
                        }
                    } else {
                        // In manual positioning, calculate targetX by centering the product
                        let productWidth = 10; // fallback
                        const dragDataStr = e.dataTransfer.getData('application/json');
                        if (dragDataStr) {
                            const dragData = JSON.parse(dragDataStr);
                            const sourceShelf = g.shelves[dragData.sourceShelfIndex];
                            const placement = sourceShelf ? sourceShelf.products[dragData.sourcePlacementIndex] : null;
                            if (placement) {
                                let pId = placement.productId;
                                let facings = placement.facings || 1;
                                let orientation = placement.orientation || 0;
                                if (dragData.sourceLayerIndex !== undefined && placement.layers && placement.layers[dragData.sourceLayerIndex]) {
                                    const layer = placement.layers[dragData.sourceLayerIndex];
                                    pId = layer.productId;
                                    facings = layer.facings || 1;
                                    orientation = layer.orientation || 0;
                                } else if (placement.layers && placement.layers.length > 0) {
                                    pId = placement.layers[0].productId;
                                    facings = placement.layers[0].facings || 1;
                                    orientation = placement.layers[0].orientation || 0;
                                }
                                const dims = state.getPlacedDimensions(pId, orientation);
                                productWidth = dims.width * facings;
                            }
                        } else {
                            const productId = e.dataTransfer.getData('text/plain');
                            const product = state.getProductById(productId);
                            if (product) {
                                productWidth = product.width;
                            }
                        }
                        targetX = dropXcm - (productWidth / 2);
                    }
                }

                const dragDataStr = e.dataTransfer.getData('application/json');
                if (dragDataStr) {
                    const dragData = JSON.parse(dragDataStr);
                    const result = state.moveProduct(dragData.sourceShelfIndex, dragData.sourcePlacementIndex, idx, targetHookIndex, dragData.sourceLayerIndex, targetX, insertIndex);
                    if (!result.success) {
                        alert(result.reason);
                        renderGondola();
                    }
                } else {
                    const productId = e.dataTransfer.getData('text/plain');
                    const result = state.placeProduct(idx, productId, 1, targetHookIndex, targetX, insertIndex);
                    if (!result.success) {
                        alert(result.reason);
                        renderGondola();
                    }
                }
            });

            const top = document.createElement('div');
            top.className = 'shelf-top';
            top.style.height = `${(isPerchero ? 2 : g.shelfDepth) * scale}px`;
            top.style.background = isPerchero ? '#64748b' : tc.shelfTop;
            shelfEl.appendChild(top);

            const front = document.createElement('div');
            front.className = 'shelf-front';
            front.style.transform = `translateZ(${(isPerchero ? 2 : g.shelfDepth) * scale}px)`;
            front.style.background = isPerchero ? '#334155' : tc.shelfFront;
            shelfEl.appendChild(front);

            // Hook rods render for perchero
            if (isPerchero) {
                const spacing = shelf.hookSpacing || 15;
                const numHooks = Math.floor(g.width / spacing);
                const margin = (g.width - (numHooks - 1) * spacing) / 2;
                
                for (let i = 0; i < numHooks; i++) {
                    const hookX = margin + i * spacing;
                    
                    // Static chrome hook rod extending forward
                    const hook = document.createElement('div');
                    hook.className = 'hook-3d';
                    hook.style.cssText = `
                        position: absolute;
                        left: ${hookX * scale - 2}px;
                        bottom: ${shelf.y * scale}px;
                        width: 4px;
                        height: 4px;
                        background: #94a3b8;
                        transform-style: preserve-3d;
                        transform: translateZ(0px);
                        pointer-events: none;
                    `;

                    const rod = document.createElement('div');
                    rod.style.cssText = `
                        position: absolute;
                        width: 4px;
                        height: 4px;
                        background: linear-gradient(90deg, #94a3b8, #cbd5e1, #94a3b8);
                        transform: rotateY(-90deg);
                        transform-origin: left;
                        width: ${g.shelfDepth * scale}px;
                        box-shadow: 0 3px 5px rgba(0,0,0,0.35);
                    `;
                    hook.appendChild(rod);
                    
                    const tip = document.createElement('div');
                    tip.style.cssText = `
                        position: absolute;
                        left: ${g.shelfDepth * scale}px;
                        bottom: 0;
                        width: 4px;
                        height: 8px;
                        background: #e2e8f0;
                        transform: rotateX(-45deg);
                    `;
                    hook.appendChild(tip);

                    gondola3d.appendChild(hook);
                }
            }

            shelf.products.forEach((p, pIdx) => {
                let layersToProcess = p.layers;
                if (!layersToProcess) {
                    if (p.productId) {
                        layersToProcess = [{ productId: p.productId, facings: p.facings || 1, orientation: p.orientation || 0 }];
                        p.layers = layersToProcess;
                    } else {
                        return;
                    }
                }
                
                if (layersToProcess.length === 0) return;

                const placementEl = document.createElement('div');
                placementEl.className = 'placement-wrapper';
                placementEl.style.position = 'absolute';
                placementEl.style.left = `${p.x * scale}px`;
                
                // Snapping product vertically so it hangs perfectly from the hook rod instead of standing on the bar
                if (isPerchero && layersToProcess.length > 0) {
                    const baseLayer = layersToProcess[0];
                    const dims = state.getPlacedDimensions(baseLayer.productId, baseLayer.orientation || 0);
                    placementEl.style.bottom = `${-dims.height * 0.85 * scale}px`;
                } else {
                    placementEl.style.bottom = `${g.shelfThickness * scale}px`;
                }
                
                placementEl.style.transformStyle = 'preserve-3d';

                let currentY = 0;
                layersToProcess.forEach((layer, lIdx) => {
                    const product = state.getProductById(layer.productId);
                    if (!product) return;

                    const dims = state.getPlacedDimensions(layer.productId, layer.orientation || 0);

                    const unitsInZ = Math.floor(g.shelfDepth / dims.depth);
                    const visualDepth = unitsInZ * dims.depth * scale;
                    
                    const layerEl = document.createElement('div');
                    layerEl.className = 'placed-product';
                    layerEl.draggable = true;
                    layerEl.style.cursor = 'grab';
                    layerEl.style.width = `${dims.width * scale * layer.facings}px`;
                    layerEl.style.height = `${dims.height * scale}px`;
                    layerEl.style.bottom = `${currentY * scale}px`;
                    layerEl.style.left = `0px`;
                    layerEl.style.transform = `translateZ(${g.shelfDepth * scale - visualDepth}px)`;

                    layerEl.addEventListener('dragstart', (e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData('application/json', JSON.stringify({
                            sourceShelfIndex: idx,
                            sourcePlacementIndex: pIdx,
                            sourceLayerIndex: lIdx
                        }));
                        e.dataTransfer.setData('text/plain', layer.productId);
                        window.currentlyDraggedProductId = layer.productId;
                        // Highlight source visual feedback
                        setTimeout(() => {
                            layerEl.style.opacity = '0.4';
                        }, 0);
                    });
                    layerEl.addEventListener('dragend', (e) => {
                        e.stopPropagation();
                        layerEl.style.opacity = '1';
                        window.currentlyDraggedProductId = null;
                    });

                    const totalUnits = (layer.facings || 1) * unitsInZ;
                    const totalValue = totalUnits * (product.price || 0);
                    const catAbbr = product.category ? product.category.substring(0, 2).toUpperCase() : 'PR';

                    const hoverCard = document.createElement('div');
                    const isTopShelf = (idx === g.numShelves - 1);
                    hoverCard.className = `product-hover-card${isTopShelf ? ' flip-down' : ''}`;
                    hoverCard.innerHTML = `
                        <div class="hover-card-thumb" style="background: linear-gradient(135deg, ${product.color || '#3b82f6'} 0%, rgba(15, 23, 42, 0.4) 100%);">
                            <span>${catAbbr}</span>
                        </div>
                        <div class="hover-card-info">
                            <div class="hover-card-sku">${product.sku || 'N/A'}</div>
                            <div class="hover-card-name">${product.name || 'Producto'}</div>
                            <div class="hover-card-stats">
                                <div class="hover-card-stat">
                                    <span>Facings:</span>
                                    <span class="val">${layer.facings || 1}</span>
                                </div>
                                <div class="hover-card-stat">
                                    <span>Profundidad:</span>
                                    <span class="val">${unitsInZ} uds. (Total: ${totalUnits})</span>
                                </div>
                                <div class="hover-card-price-row">
                                    <span class="hover-card-price-label">Valor Fila:</span>
                                    <span class="hover-card-price-val">$${totalValue.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    `;
                    hoverCard.style.setProperty('--badge-z', `${visualDepth + 15}px`);
                    layerEl.appendChild(hoverCard);

                    layerEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openProductModal(product, layer, idx, pIdx, unitsInZ, dims, lIdx);
                    });

                    const box = document.createElement('div');
                    box.className = 'product-box';
                    
                    const unitW = dims.width * scale;
                    const unitH = dims.height * scale;
                    const unitD = dims.depth * scale;
                    const gridBg = `linear-gradient(to right, rgba(0,0,0,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.25) 1px, transparent 1px)`;

                    const faceFront = document.createElement('div');
                    faceFront.className = 'face face-front';
                    faceFront.style.background = `${gridBg}, ${product.color}`;
                    faceFront.style.backgroundSize = `${unitW}px ${unitH}px`;
                    faceFront.style.transform = `translateZ(${visualDepth}px)`;
                    faceFront.innerHTML = `${layer.facings > 1 ? layer.facings + 'X' : ''}`;
                    if (isPerchero) {
                        const hole = document.createElement('div');
                        hole.style.cssText = `
                            position: absolute;
                            top: 4px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 6px;
                            height: 6px;
                            background: #0f172a;
                            border-radius: 50%;
                            border: 1px solid rgba(255,255,255,0.2);
                        `;
                        faceFront.appendChild(hole);
                    }
                    box.appendChild(faceFront);

                    const faceTop = document.createElement('div');
                    faceTop.className = 'face face-top';
                    faceTop.style.background = `${gridBg}, ${product.color}`;
                    faceTop.style.backgroundSize = `${unitW}px ${unitD}px`;
                    faceTop.style.height = `${visualDepth}px`;
                    box.appendChild(faceTop);

                    const faceSide = document.createElement('div');
                    faceSide.className = 'face face-side';
                    faceSide.style.background = `${gridBg}, ${product.color}`;
                    faceSide.style.backgroundSize = `${unitD}px ${unitH}px`;
                    faceSide.style.width = `${visualDepth}px`;
                    box.appendChild(faceSide);

                    const faceLeft = document.createElement('div');
                    faceLeft.className = 'face face-left';
                    faceLeft.style.background = `${gridBg}, ${product.color}`;
                    faceLeft.style.backgroundSize = `${unitD}px ${unitH}px`;
                    faceLeft.style.width = `${visualDepth}px`;
                    box.appendChild(faceLeft);

                    layerEl.appendChild(box);

                    layerEl.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); layerEl.style.boxShadow = '0 0 15px gold'; });
                    layerEl.addEventListener('dragleave', () => { layerEl.style.boxShadow = 'none'; });
                    layerEl.addEventListener('drop', (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const droppedProductId = e.dataTransfer.getData('text/plain');
                        const result = state.stackProduct(idx, pIdx, droppedProductId);
                        if (!result.success) alert(result.reason);
                    });

                    layerEl.addEventListener('dblclick', (e) => { e.stopPropagation(); state.removeFromShelf(idx, pIdx, lIdx); });
                    
                    placementEl.appendChild(layerEl);
                    currentY += dims.height;
                });

                shelfEl.appendChild(placementEl);
            });

            gondola3d.appendChild(shelfEl);
        });

        renderShelfTypesControls();
    }

    function renderShelfTypesControls() {
        const container = document.getElementById('shelf-types-container');
        const group = document.getElementById('group-shelf-types');
        if (!container || !group) return;

        const g = state.gondola;
        if (!g.shelves || g.shelves.length === 0) {
            group.style.display = 'none';
            return;
        }

        group.style.display = 'block';
        container.innerHTML = '';

        [...g.shelves].reverse().forEach(shelf => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; flex-direction:column; font-size:12px; background:rgba(255,255,255,0.02); padding:8px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.04); margin-bottom: 6px; gap: 4px;';
            
            const controlGroup = document.createElement('div');
            controlGroup.style.cssText = 'display:flex; flex-direction:column; width:100%; gap:4px;';

            const headerLine = document.createElement('div');
            headerLine.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';

            const label = document.createElement('span');
            label.innerText = `Nivel ${shelf.index + 1}`;
            label.style.fontWeight = '600';
            
            const select = document.createElement('select');
            select.style.cssText = 'background:#0f172a; border:1px solid var(--border); color:white; border-radius:4px; padding:3px 6px; font-size:11px;';
            select.innerHTML = `
                <option value="plancha" ${shelf.type === 'plancha' ? 'selected' : ''}>Plancha</option>
                <option value="perchero" ${shelf.type === 'perchero' ? 'selected' : ''}>Perchero</option>
            `;
            
            select.addEventListener('change', (e) => {
                state.setShelfType(shelf.index, e.target.value);
            });

            headerLine.appendChild(label);
            headerLine.appendChild(select);
            controlGroup.appendChild(headerLine);

            if (shelf.type === 'perchero') {
                const sliderLine = document.createElement('div');
                sliderLine.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);';
                
                const sliderLabel = document.createElement('span');
                sliderLabel.style.cssText = 'font-size:10px; color:var(--text-muted); font-weight: 500;';
                sliderLabel.innerText = `Separación: ${shelf.hookSpacing || 15}cm`;
                
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = '10';
                slider.max = '30';
                slider.step = '5';
                slider.value = shelf.hookSpacing || 15;
                slider.style.cssText = 'width:90px; height:4px; accent-color:#009639; cursor:pointer;';
                
                slider.addEventListener('input', (e) => {
                    const val = e.target.value;
                    sliderLabel.innerText = `Separación: ${val}cm`;
                });
                
                slider.addEventListener('change', (e) => {
                    const proposed = parseFloat(e.target.value);
                    const check = state.checkHookSpacingOverlap(shelf.index, proposed);
                    if (!check.valid) {
                        alert(`⚠️ Imposible reducir separación:\n\n${check.reason}`);
                        e.target.value = shelf.hookSpacing || 15;
                        sliderLabel.innerText = `Separación: ${shelf.hookSpacing || 15}cm`;
                        return;
                    }
                    state.setShelfHookSpacing(shelf.index, proposed);
                });
                
                sliderLine.appendChild(sliderLabel);
                sliderLine.appendChild(slider);
                controlGroup.appendChild(sliderLine);
            }

            row.appendChild(controlGroup);
            container.appendChild(row);
        });
    }

    function renderLibrary() {
        libraryList.innerHTML = '';
        state.library.forEach(p => {
            const el = document.createElement('div');
            el.style.cssText = 'background:rgba(255,255,255,0.05); padding:8px; border-radius:4px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; cursor:pointer;';
            el.innerHTML = `
                <div style="flex:1;">
                    <div style="font-size:11px; font-weight:600;">${p.name}</div>
                    <div style="font-size:9px; color:var(--text-muted);">${p.config.type.toUpperCase()} | ${p.config.width}x${p.config.height}</div>
                </div>
                <button class="delete-preset" data-id="${p.id}" style="background:transparent; border:none; color:#ef4444; cursor:pointer; padding:4px;">&times;</button>
            `;
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-preset')) return;
                state.loadPreset(p.id);
                Object.keys(inputs).forEach(key => {
                    if (key === 'gap') inputs[key].value = state.gondola.gapBetweenShelves;
                    else if (inputs[key]) inputs[key].value = state.gondola[key];
                });
            });
            el.querySelector('.delete-preset').addEventListener('click', (e) => {
                state.deletePreset(p.id);
            });
            libraryList.appendChild(el);
        });
    }

    function renderCatalog() {
        catalogList.innerHTML = '';
        const categories = {};
        const filterText = catalogSearch ? catalogSearch.value.trim().toLowerCase() : '';

        state.products.forEach(p => {
            const searchTarget = `${p.name} ${p.sku} ${p.category}`.toLowerCase();
            if (filterText && !searchTarget.includes(filterText)) return;
            if (!categories[p.category]) categories[p.category] = [];
            categories[p.category].push(p);
        });

        if (Object.keys(categories).length === 0) {
            catalogList.innerHTML = `<div style="padding: 20px; color: var(--text-muted); font-size: 13px; text-align: center;">No se encontraron productos para "${filterText}".</div>`;
            return;
        }

        Object.keys(categories).forEach(cat => {
            // Category Wrapper
            const catWrapper = document.createElement('div');
            catWrapper.style.cssText = 'margin-bottom: 12px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); overflow: hidden;';

            // Clickable Header Bar
            const header = document.createElement('div');
            header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background: rgba(0,0,0,0.2); cursor:pointer; font-size:12px; font-weight:700; color:var(--text); text-transform:uppercase; user-select:none; transition: all 0.2s ease;';
            header.innerHTML = `
                <span>${cat} <span style="font-size:10px; color:var(--text-muted); font-weight:normal; text-transform:none; margin-left:4px;">(${categories[cat].length})</span></span>
                <span class="category-arrow" style="font-size:10px; color:var(--text-muted); transition: transform 0.2s ease; display: inline-block;">▶</span>
            `;

            // Products Container (Initially Collapsed)
            const productsContainer = document.createElement('div');
            productsContainer.style.cssText = 'display: none; padding: 12px; flex-direction: column; gap: 10px; border-top: 1px solid var(--border); background: rgba(0,0,0,0.1);';

            // Click Handler to toggle expand/collapse
            header.addEventListener('click', () => {
                const arrow = header.querySelector('.category-arrow');
                if (productsContainer.style.display === 'none') {
                    productsContainer.style.display = 'flex';
                    arrow.style.transform = 'rotate(90deg)';
                    header.style.background = 'rgba(99, 102, 241, 0.1)';
                    header.style.color = 'var(--primary)';
                } else {
                    productsContainer.style.display = 'none';
                    arrow.style.transform = 'rotate(0deg)';
                    header.style.background = 'rgba(0,0,0,0.2)';
                    header.style.color = 'var(--text)';
                }
            });

            // Render each product inside this category
            categories[cat].forEach(p => {
                const el = document.createElement('div');
                el.className = 'draggable-product';
                el.draggable = true;
                
                el.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-size: 10px; font-weight: 700; color: var(--text-muted);">${p.sku}</span>
                        <span class="pill-dim">${p.width}x${p.height}x${p.depth} cm</span>
                    </div>
                    <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text); line-height: 1.4;">${p.name}</h4>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 12px; font-weight: 700; color: var(--primary);">$${p.price.toFixed(2)}</span>
                        <div style="width: 12px; height: 12px; border-radius: 3px; background-color: ${p.color}; border: 1px solid rgba(0,0,0,0.1);"></div>
                    </div>
                `;

                el.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', p.id);
                    window.currentlyDraggedProductId = p.id;
                });
                el.addEventListener('dragend', () => {
                    window.currentlyDraggedProductId = null;
                });

                productsContainer.appendChild(el);
            });

            catWrapper.appendChild(header);
            catWrapper.appendChild(productsContainer);
            catalogList.appendChild(catWrapper);
        });
    }

    function setupEventListeners() {
        let currentRotateX = -10;
        let currentRotateY = -20;
        let currentZoom = 1;
        let isDragging = false;
        let startMouseX = 0;
        let startMouseY = 0;
        let startRotateX = 0;
        let startRotateY = 0;

        const resetView = document.getElementById('reset-view');

        const updateTransform = () => {
            gondola3d.style.transform = `scale(${currentZoom}) rotateX(${currentRotateX}deg) rotateY(${currentRotateY}deg)`;
        };

        if(resetView) {
            resetView.addEventListener('click', () => {
                currentRotateX = -10;
                currentRotateY = -20;
                currentZoom = 1;
                updateTransform();
            });
        }

        const viewportContainer = document.querySelector('.viewport');
        
        // Prevent default context menu on right click
        viewportContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        viewportContainer.addEventListener('mousedown', (e) => {
            // Only allow right click (button 2) to rotate
            if (e.button !== 2) return;
            if(e.target.closest('button') || e.target.closest('input') || e.target.closest('.draggable-product')) return;
            
            isDragging = true;
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            startRotateX = currentRotateX;
            startRotateY = currentRotateY;
            viewportContainer.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startMouseX;
            const deltaY = e.clientY - startMouseY;
            
            currentRotateY = startRotateY + deltaX * 0.5;
            currentRotateX = startRotateX - deltaY * 0.5;
            
            currentRotateX = Math.max(-60, Math.min(60, currentRotateX));
            
            updateTransform();
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            viewportContainer.style.cursor = 'default';
        });

        viewportContainer.addEventListener('wheel', (e) => {
            if(e.target.closest('.dashboard-overlay')) return;
            
            e.preventDefault();
            const zoomSpeed = 0.05;
            if (e.deltaY < 0) {
                currentZoom += zoomSpeed;
            } else {
                currentZoom -= zoomSpeed;
            }
            currentZoom = Math.max(0.3, Math.min(3.0, currentZoom));
            updateTransform();
        }, { passive: false });
        
        updateTransform();

        if (catalogSearch) {
            catalogSearch.addEventListener('input', () => {
                renderCatalog();
            });
        }

        // Inputs Sync
        const dimPreset = document.getElementById('input-dim-preset');
        if (dimPreset) {
            dimPreset.addEventListener('change', (e) => {
                if (e.target.value === 'custom') return;
                const [w, h, d] = e.target.value.split('x').map(Number);
                inputs.width.value = w;
                inputs.height.value = h;
                inputs.depth.value = d;
                state.updateGondola({ width: w, height: h, depth: d, shelfWidth: w, shelfDepth: d });
            });
        }

        Object.keys(inputs).forEach(key => {
            if (!inputs[key]) return;
            inputs[key].addEventListener('change', (e) => {
                if (key === 'autoPack') {
                    state.toggleAutoPack();
                    return;
                }
                if (key === 'type') {
                    const type = e.target.value;
                    const presets = {
                        central: { width: 120, height: 150, depth: 45, baseHeight: 15, numShelves: 4 },
                        cabecera: { width: 90, height: 150, depth: 35, baseHeight: 15, numShelves: 4 },
                        pared: { width: 100, height: 210, depth: 40, baseHeight: 20, numShelves: 5 },
                        refrigerado: { width: 180, height: 200, depth: 65, baseHeight: 25, numShelves: 4 }
                    };
                    const preset = presets[type];
                    if (preset) {
                        inputs.width.value = preset.width;
                        inputs.height.value = preset.height;
                        inputs.depth.value = preset.depth;
                        inputs.baseHeight.value = preset.baseHeight;
                        inputs.numShelves.value = preset.numShelves;
                        
                        state.updateGondola({
                            type: type,
                            width: preset.width,
                            height: preset.height,
                            depth: preset.depth,
                            baseHeight: preset.baseHeight,
                            numShelves: preset.numShelves
                        });
                    }
                    return;
                }

                const val = parseFloat(e.target.value);
                const updates = {};
                if (key === 'gap') updates.gapBetweenShelves = val;
                else updates[key] = val;
                
                if (dimPreset && ['width', 'height', 'depth'].includes(key)) {
                    dimPreset.value = 'custom';
                }
                state.updateGondola(updates);
            });
        });

        // Duplicate Gondola
        const btnDup = document.getElementById('btn-duplicate-gondola');
        if (btnDup) {
            btnDup.addEventListener('click', () => {
                state.duplicateGondola();
            });
        }

        // Report
        document.getElementById('btn-report').addEventListener('click', () => {
            generateReport();
            document.getElementById('report-modal').style.display = 'grid';
        });
        document.getElementById('close-report').addEventListener('click', () => { document.getElementById('report-modal').style.display = 'none'; });

        // PDF Download
        const btnDownload = document.getElementById('btn-download-pdf');
        if (btnDownload) {
            btnDownload.addEventListener('click', downloadPDF);
        }

        // Excel Download for current gondola report
        const btnDownloadXlsx = document.getElementById('btn-download-xlsx');
        if (btnDownloadXlsx) {
            btnDownloadXlsx.addEventListener('click', downloadCurrentGondolaExcel);
        }

        // Inline report Excel Download
        const btnInlineDownloadXlsx = document.getElementById('btn-inline-download-xlsx');
        if (btnInlineDownloadXlsx) {
            btnInlineDownloadXlsx.addEventListener('click', () => {
                const store = state.stores.find(s => s.id === state.currentStoreId);
                if (!store) {
                    alert('Selecciona una tienda válida antes de descargar el Excel.');
                    return;
                }
                downloadStoreExcel(store, `Reporte_Global_${store.name.replace(/\s+/g, '_')}`);
            });
        }

        state.on('gondola:updated', renderGondola);
        state.on('dashboard:update', updateDashboard);
    }

    function generateGlobalReport() {
        const store = state.stores.find(s => s.id === state.currentStoreId);
        const reportContent = document.getElementById('report-content');
        
        if (!store || !store.library || store.library.length === 0) {
            reportContent.innerHTML = '<p>No hay góndolas en esta tienda para reportar.</p>';
            return;
        }

        let html = `<h3 style="margin-bottom: 16px;">Reporte Global: ${store.name}</h3>`;
        html += '<table class="report-table" id="report-table" style="width: 100%; border-collapse: collapse;"><thead><tr style="background: var(--primary); color: white;"><th>SKU</th><th>Nombre</th><th>Cantidad</th><th>Precio Unit.</th><th>Valor Total</th></tr></thead><tbody>';
        
        let grandTotalUnits = 0;
        let grandTotalValue = 0;
        let grandUniqueSkus = new Set();

        store.library.forEach(g => {
            let gondolaHasProducts = false;
            let gondolaTotalUnits = 0;
            let gondolaTotalValue = 0;
            
            let gondolaHtml = `<tr style="background: rgba(0, 150, 57, 0.15); font-weight: 800; font-size: 1.1em;">
                <td colspan="5" style="padding: 12px 8px; border-bottom: 2px solid var(--primary); color: var(--text); text-align: left;">
                    Góndola: ${g.name}
                </td>
            </tr>`;

            g.config.shelves.forEach((s, sIdx) => {
                const shelfProducts = [];
                let shelfTotalUnits = 0;
                let shelfTotalValue = 0;

                s.products.forEach(p => {
                    let layersToProcess = p.layers;
                    if (!layersToProcess) {
                        if (p.productId) {
                            layersToProcess = [];
                            for(let i=0; i < (p.stacks || 1); i++) {
                                layersToProcess.push({ productId: p.productId, facings: p.facings, orientation: p.orientation || 0 });
                            }
                        } else {
                            return;
                        }
                    }

                    layersToProcess.forEach(layer => {
                        const product = state.getProductById(layer.productId);
                        if (!product) return;
                        
                        const dims = state.getPlacedDimensions(layer.productId, layer.orientation || 0);
                        const unitsInZ = Math.floor(g.config.shelfDepth / dims.depth);
                        const totalUnits = layer.facings * unitsInZ;
                        
                        let existing = shelfProducts.find(x => x.sku === product.sku);
                        if (!existing) {
                            existing = { sku: product.sku, name: product.name, units: 0, price: product.price, totalValue: 0 };
                            shelfProducts.push(existing);
                        }
                        existing.units += totalUnits;
                        existing.totalValue += (totalUnits * product.price);
                        
                        shelfTotalUnits += totalUnits;
                        shelfTotalValue += (totalUnits * product.price);
                        
                        gondolaTotalUnits += totalUnits;
                        gondolaTotalValue += (totalUnits * product.price);
                        
                        grandTotalUnits += totalUnits;
                        grandTotalValue += (totalUnits * product.price);
                        grandUniqueSkus.add(product.sku);
                    });
                });

                if (shelfProducts.length > 0) {
                    gondolaHasProducts = true;
                    const isPerchero = s.type === 'perchero';
                    const levelName = isPerchero ? `Nivel ${sIdx + 1} (Perchero)` : `Nivel ${sIdx + 1} (Plancha)`;
                    
                    gondolaHtml += `<tr style="background: var(--primary-light); font-weight: 700;">
                        <td colspan="5" style="padding: 8px; border-bottom: 1px solid var(--border); color: var(--primary); text-align: left;">
                            ${levelName}
                        </td>
                    </tr>`;
                    
                    shelfProducts.forEach(data => {
                        gondolaHtml += `<tr>
                            <td>${data.sku}</td>
                            <td>${data.name}</td>
                            <td>${data.units}</td>
                            <td>$${data.price.toFixed(2)}</td>
                            <td>$${data.totalValue.toFixed(2)}</td>
                        </tr>`;
                    });
                    
                    gondolaHtml += `<tr style="font-weight: 600; font-size: 0.9em; background: rgba(0,0,0,0.02);">
                        <td colspan="2" style="text-align: right; padding-right: 16px; color: var(--text-muted);">Subtotal ${levelName}:</td>
                        <td>${shelfTotalUnits}</td>
                        <td>-</td>
                        <td>$${shelfTotalValue.toFixed(2)}</td>
                    </tr>`;
                }
            });

            if (gondolaHasProducts) {
                gondolaHtml += `<tr style="font-weight: 700; background: rgba(0, 150, 57, 0.08);">
                    <td colspan="2" style="text-align: right; padding-right: 16px; color: var(--primary);">Total ${g.name}:</td>
                    <td>${gondolaTotalUnits}</td>
                    <td>-</td>
                    <td>$${gondolaTotalValue.toFixed(2)}</td>
                </tr>`;
                html += gondolaHtml;
            } else {
                html += gondolaHtml + `<tr><td colspan="5" style="text-align: center; padding: 10px; color: var(--text-muted);">Sin productos</td></tr>`;
            }
        });

        html += `<tr style="font-weight: bold; background: var(--primary); color: white; border-top: 2px solid var(--primary-hover);">
            <td colspan="2" style="text-align: right; padding-right: 16px;">TOTAL GLOBAL (${grandUniqueSkus.size} SKUs Únicos)</td>
            <td>${grandTotalUnits}</td>
            <td>-</td>
            <td>$${grandTotalValue.toFixed(2)}</td>
        </tr>`;

        html += '</tbody></table>';
        reportContent.innerHTML = html;
    }

    function generateInlineReport(store) {
        const section = document.getElementById('inline-report-section');
        const content = document.getElementById('inline-report-content');
        
        try {
            content.style.display = 'block';
            document.getElementById('inline-report-title').innerText = `Reporte: ${store.name}`;

            if (!store.library || store.library.length === 0) {
                content.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No hay góndolas en esta tienda para reportar.</p>';
                section.style.display = 'block';
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }

            let summaryHtml = '';
            let html = '<table class="report-table" id="inline-report-table" style="width: 100%; border-collapse: collapse;"><thead><tr style="background: var(--primary); color: white;"><th>SKU</th><th>Nombre</th><th>Cantidad</th><th>Precio Unit.</th><th>Valor Total</th></tr></thead><tbody>';
            
            let grandTotalUnits = 0;
            let grandTotalValue = 0;
            let grandUniqueSkus = new Set();

            store.library.forEach(g => {
                if (!g || !g.config || !g.config.shelves) return;
                
                let gondolaHasProducts = false;
                let gondolaTotalUnits = 0;
                let gondolaTotalValue = 0;
                
                let gondolaHtml = `<tr style="background: rgba(0, 150, 57, 0.15); font-weight: 800; font-size: 1.1em;">
                    <td colspan="5" style="padding: 12px 8px; border-bottom: 2px solid var(--primary); color: var(--text); text-align: left;">
                        Góndola: ${g.name}
                    </td>
                </tr>`;

                g.config.shelves.forEach((s, sIdx) => {
                    if (!s || !s.products) return;
                    const shelfProducts = [];
                    let shelfTotalUnits = 0;
                    let shelfTotalValue = 0;

                    s.products.forEach(p => {
                        if (!p) return;
                        let layersToProcess = p.layers;
                        if (!layersToProcess && p.productId) {
                            layersToProcess = [];
                            for (let i = 0; i < (p.stacks || 1); i++) {
                                layersToProcess.push({ productId: p.productId, facings: p.facings || 1, orientation: p.orientation || 0 });
                            }
                        }
                        if (!layersToProcess) return;

                        layersToProcess.forEach(layer => {
                            if (!layer || !layer.productId) return;
                            const product = state.getProductById(layer.productId);
                            if (!product) return;
                            
                            const dims = state.getPlacedDimensions(layer.productId, layer.orientation || 0);
                            if (!dims || !dims.depth || dims.depth <= 0) return;
                            
                            const unitsInZ = Math.floor(g.config.shelfDepth / dims.depth);
                            const totalUnits = (layer.facings || 1) * unitsInZ;
                            
                            let existing = shelfProducts.find(x => x.sku === product.sku);
                            if (!existing) {
                                existing = { sku: product.sku, name: product.name, units: 0, price: product.price, totalValue: 0 };
                                shelfProducts.push(existing);
                            }
                            existing.units += totalUnits;
                            existing.totalValue += (totalUnits * product.price);
                            
                            shelfTotalUnits += totalUnits;
                            shelfTotalValue += (totalUnits * product.price);
                            
                            gondolaTotalUnits += totalUnits;
                            gondolaTotalValue += (totalUnits * product.price);
                            
                            grandTotalUnits += totalUnits;
                            grandTotalValue += (totalUnits * product.price);
                            grandUniqueSkus.add(product.sku);
                        });
                    });

                    if (shelfProducts.length > 0) {
                        gondolaHasProducts = true;
                        const isPerchero = s.type === 'perchero';
                        const levelName = isPerchero ? `Nivel ${sIdx + 1} (Perchero)` : `Nivel ${sIdx + 1} (Plancha)`;
                        
                        gondolaHtml += `<tr style="background: var(--primary-light); font-weight: 700;">
                            <td colspan="5" style="padding: 8px; border-bottom: 1px solid var(--border); color: var(--primary); text-align: left;">
                                ${levelName}
                            </td>
                        </tr>`;
                        
                        shelfProducts.forEach(data => {
                            gondolaHtml += `<tr><td>${data.sku}</td><td>${data.name}</td><td>${data.units}</td><td>$${data.price.toFixed(2)}</td><td>$${data.totalValue.toFixed(2)}</td></tr>`;
                        });
                        
                        gondolaHtml += `<tr style="font-weight: 600; font-size: 0.9em; background: rgba(0,0,0,0.02);">
                            <td colspan="2" style="text-align: right; padding-right: 16px; color: var(--text-muted);">Subtotal ${levelName}:</td>
                            <td>${shelfTotalUnits}</td>
                            <td>-</td>
                            <td>$${shelfTotalValue.toFixed(2)}</td>
                        </tr>`;
                    }
                });

                if (gondolaHasProducts) {
                    gondolaHtml += `<tr style="font-weight: 700; background: rgba(0, 150, 57, 0.08);">
                        <td colspan="2" style="text-align: right; padding-right: 16px; color: var(--primary);">Total ${g.name}:</td>
                        <td>${gondolaTotalUnits}</td>
                        <td>-</td>
                        <td>$${gondolaTotalValue.toFixed(2)}</td>
                    </tr>`;
                    html += gondolaHtml;
                } else {
                    html += gondolaHtml + `<tr><td colspan="5" style="text-align: center; padding: 10px; color: var(--text-muted);">Sin productos</td></tr>`;
                }
            });

            html += `<tr style="font-weight: bold; background: var(--primary); color: white; border-top: 2px solid var(--primary-hover);">
                <td colspan="2" style="text-align: right; padding-right: 16px;">TOTAL GLOBAL (${grandUniqueSkus.size} SKUs)</td><td>${grandTotalUnits}</td><td>-</td><td>$${grandTotalValue.toFixed(2)}</td></tr>`;
            html += '</tbody></table>';

            summaryHtml = `
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; margin-bottom:28px;">
                <div style="background:#ffffff; border:1px solid var(--border); padding:16px; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.01); border-left:4px solid var(--primary);">
                    <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Inventario de Tienda</span>
                    <h4 style="font-size:22px; font-weight:800; color:var(--text); margin-top:4px;">$${grandTotalValue.toFixed(2)}</h4>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:2px;">Valor total consolidado</p>
                </div>
                <div style="background:#ffffff; border:1px solid var(--border); padding:16px; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.01); border-left:4px solid var(--accent-orange);">
                    <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Capacidad Ocupada</span>
                    <h4 style="font-size:22px; font-weight:800; color:var(--text); margin-top:4px;">${grandTotalUnits} U.</h4>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:2px;">Unidades totales colocadas</p>
                </div>
                <div style="background:#ffffff; border:1px solid var(--border); padding:16px; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.01); border-left:4px solid #6366f1;">
                    <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Diversidad de SKUs</span>
                    <h4 style="font-size:22px; font-weight:800; color:var(--text); margin-top:4px;">${grandUniqueSkus.size} SKUs</h4>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:2px;">Referencias de productos activas</p>
                </div>
            </div>
            `;

            content.innerHTML = summaryHtml + html;
            section.style.display = 'block';
            setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        } catch (error) {
            console.error("Error generating inline report:", error);
            content.innerHTML = `<p style="color:#ef4444; text-align:center; padding:20px; font-weight:600;">Ocurrió un error al generar el reporte: ${error.message}. Por favor, intenta de nuevo o recarga la página.</p>`;
            section.style.display = 'block';
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    document.getElementById('btn-close-inline-report').addEventListener('click', () => {
        document.getElementById('inline-report-section').style.display = 'none';
    });

    document.getElementById('btn-inline-download-pdf').addEventListener('click', () => {
        const table = document.getElementById('inline-report-table');
        if (!table || typeof window.jspdf === 'undefined') { alert('No hay reporte para descargar o falta la librería PDF.'); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');
        doc.setFontSize(20);
        doc.text('Reporte Global - PlanogramPro', 40, 40);
        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date().toLocaleString()}`, 40, 60);
        doc.autoTable({
            html: '#inline-report-table',
            startY: 80,
            theme: 'grid',
            headStyles: { fillColor: [0, 150, 57] },
            styles: { fontSize: 9 },
            didParseCell: function(data) {
                const firstCell = data.row.cells[0];
                if (firstCell && firstCell.text && firstCell.text.length > 0) {
                    const txt = (firstCell.text[0] || '').trim();
                    if (txt.indexOf('Góndola:') === 0) {
                        data.cell.styles.fillColor = [217, 238, 225];
                        data.cell.styles.textColor = [31, 41, 55];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (txt.indexOf('Nivel ') === 0) {
                        data.cell.styles.fillColor = [240, 253, 244];
                        data.cell.styles.textColor = [0, 150, 57];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (txt.indexOf('Subtotal ') === 0) {
                        data.cell.styles.fillColor = [249, 250, 251];
                        data.cell.styles.textColor = [107, 114, 128];
                        data.cell.styles.fontStyle = 'bold';
                        if (data.column.index === 0) {
                            data.cell.styles.halign = 'right';
                        }
                    } else if (txt.indexOf('Total ') === 0) {
                        data.cell.styles.fillColor = [235, 247, 239];
                        data.cell.styles.textColor = [0, 150, 57];
                        data.cell.styles.fontStyle = 'bold';
                        if (data.column.index === 0) {
                            data.cell.styles.halign = 'right';
                        }
                    } else if (txt.indexOf('TOTAL GLOBAL') === 0) {
                        data.cell.styles.fillColor = [0, 150, 57];
                        data.cell.styles.textColor = [255, 255, 255];
                        data.cell.styles.fontStyle = 'bold';
                        if (data.column.index === 0) {
                            data.cell.styles.halign = 'right';
                        }
                    }
                }
            }
        });
        doc.save(`Reporte_Global_${Date.now()}.pdf`);
    });

    function generateStoreDetailsGlobalReport(store) {
        const section = document.getElementById('details-report-section');
        const content = document.getElementById('details-report-content');
        
        try {
            if (!store.library || store.library.length === 0) {
                content.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No hay góndolas en esta tienda para reportar.</p>';
                section.style.display = 'block';
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }

            // Consolidated Store Stats
            let grandTotalUnits = 0;
            let grandTotalValue = 0;
            let grandUniqueSkus = new Set();
            const productStoreMap = {}; // SKU -> { sku, name, category, totalUnits, price, totalValue }

            // Render each Gondola table details
            let html = '';

            store.library.forEach(g => {
                if (!g || !g.config || !g.config.shelves) return;
                
                let gondolaTotalUnits = 0;
                let gondolaTotalValue = 0;
                let gondolaUniqueSkus = new Set();
                let tableRowsHtml = '';

                g.config.shelves.forEach((s, sIdx) => {
                    if (!s || !s.products) return;
                    const shelfProducts = [];
                    let shelfTotalUnits = 0;
                    let shelfTotalValue = 0;

                    s.products.forEach(p => {
                        if (!p) return;
                        let layersToProcess = p.layers;
                        if (!layersToProcess && p.productId) {
                            layersToProcess = [{ productId: p.productId, facings: p.facings || 1, orientation: p.orientation || 0 }];
                        }
                        if (!layersToProcess) return;

                        layersToProcess.forEach(layer => {
                            if (!layer || !layer.productId) return;
                            const product = state.getProductById(layer.productId);
                            if (!product) return;

                            const dims = state.getPlacedDimensions(layer.productId, layer.orientation || 0);
                            if (!dims || !dims.depth || dims.depth <= 0) return;
                            
                            const unitsInZ = Math.floor(g.config.shelfDepth / dims.depth);
                            const totalUnits = (layer.facings || 1) * unitsInZ;

                            let existing = shelfProducts.find(x => x.sku === product.sku);
                            if (!existing) {
                                existing = { sku: product.sku, name: product.name, units: 0, price: product.price, totalValue: 0 };
                                shelfProducts.push(existing);
                            }
                            existing.units += totalUnits;
                            existing.totalValue += (totalUnits * product.price);

                            shelfTotalUnits += totalUnits;
                            shelfTotalValue += (totalUnits * product.price);

                            gondolaTotalUnits += totalUnits;
                            gondolaTotalValue += (totalUnits * product.price);
                            gondolaUniqueSkus.add(product.sku);

                            grandTotalUnits += totalUnits;
                            grandTotalValue += (totalUnits * product.price);
                            grandUniqueSkus.add(product.sku);

                            // Storewide map
                            if (!productStoreMap[product.sku]) {
                                productStoreMap[product.sku] = {
                                    sku: product.sku,
                                    name: product.name,
                                    category: product.category || 'Medicina',
                                    totalUnits: 0,
                                    price: product.price,
                                    totalValue: 0
                                };
                            }
                            productStoreMap[product.sku].totalUnits += totalUnits;
                            productStoreMap[product.sku].totalValue += (totalUnits * product.price);
                        });
                    });

                    if (shelfProducts.length > 0) {
                        const isPerchero = s.type === 'perchero';
                        const levelName = isPerchero ? `Nivel ${sIdx + 1} (Perchero)` : `Nivel ${sIdx + 1} (Plancha)`;
                        
                        tableRowsHtml += `<tr style="background: var(--primary-light); font-weight: 700;">
                            <td colspan="5" style="padding: 8px 12px; border-bottom: 1px solid var(--border); color: var(--primary); text-align: left; font-size:12px;">
                                ${levelName}
                            </td>
                        </tr>`;
                        
                        shelfProducts.forEach(data => {
                            tableRowsHtml += `<tr style="font-size:12px;">
                                <td style="padding: 10px 12px; font-family:monospace; font-weight:600;">${data.sku}</td>
                                <td style="padding: 10px 12px;">${data.name}</td>
                                <td style="padding: 10px 12px; font-weight:700;">${data.units} U.</td>
                                <td style="padding: 10px 12px;">$${data.price.toFixed(2)}</td>
                                <td style="padding: 10px 12px; font-weight:700; color:var(--text);">$${data.totalValue.toFixed(2)}</td>
                            </tr>`;
                        });
                        
                        tableRowsHtml += `<tr style="font-weight: 600; font-size: 11px; background: rgba(0,0,0,0.01);">
                            <td colspan="2" style="text-align: right; padding: 8px 12px; color: var(--text-muted);">Subtotal ${levelName}:</td>
                            <td style="padding: 8px 12px; font-weight:700;">${shelfTotalUnits} U.</td>
                            <td>-</td>
                            <td style="padding: 8px 12px; font-weight:700;">$${shelfTotalValue.toFixed(2)}</td>
                        </tr>`;
                    }
                });

                // Gondola container card
                html += `
                <div style="background:#ffffff; border:1px solid var(--border); border-radius:12px; margin-bottom:24px; overflow:hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                    <div style="padding:14px 18px; background:rgba(0, 150, 57, 0.04); border-bottom:1px solid rgba(0, 150, 57, 0.1); display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h4 style="font-size:15px; font-weight:700; color:var(--text);">${g.name}</h4>
                            <span style="font-size:11px; color:var(--text-muted); font-weight:500;">
                                Tipo: ${g.config.type === 'pared' ? 'Pared' : g.config.type === 'central' ? 'Central' : g.config.type === 'cabecera' ? 'Cabecera' : 'Refrigerado'} · 
                                Dimensiones: ${g.config.width}x${g.config.height}x${g.config.depth} cm
                            </span>
                        </div>
                        <div style="text-align:right;">
                            <span style="font-size:14px; font-weight:700; color:var(--primary); display:block;">$${gondolaTotalValue.toFixed(2)}</span>
                            <span style="font-size:10px; color:var(--text-muted); font-weight:600;">${gondolaTotalUnits} Unidades · ${gondolaUniqueSkus.size} SKUs</span>
                        </div>
                    </div>
                    <div style="padding:12px;">
                        <table class="report-table" style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid var(--border);">
                                    <th style="padding: 10px 12px; text-align:left; font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">SKU</th>
                                    <th style="padding: 10px 12px; text-align:left; font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Producto</th>
                                    <th style="padding: 10px 12px; text-align:left; font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Cantidad</th>
                                    <th style="padding: 10px 12px; text-align:left; font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Precio Unit.</th>
                                    <th style="padding: 10px 12px; text-align:left; font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Valor Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRowsHtml || '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">Sin productos colocados</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>`;
            });

            // Store summary banner card (PREVIEW ON-SCREEN)
            let summaryCardsHtml = `
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; margin-bottom:28px;">
                <div style="background:#ffffff; border:1px solid var(--border); padding:16px; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.01); border-left:4px solid var(--primary);">
                    <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Inventario de Tienda</span>
                    <h4 style="font-size:22px; font-weight:800; color:var(--text); margin-top:4px;">$${grandTotalValue.toFixed(2)}</h4>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:2px;">Valor total consolidado</p>
                </div>
                <div style="background:#ffffff; border:1px solid var(--border); padding:16px; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.01); border-left:4px solid var(--accent-orange);">
                    <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Capacidad Ocupada</span>
                    <h4 style="font-size:22px; font-weight:800; color:var(--text); margin-top:4px;">${grandTotalUnits} U.</h4>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:2px;">Unidades totales colocadas</p>
                </div>
                <div style="background:#ffffff; border:1px solid var(--border); padding:16px; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.01); border-left:4px solid #6366f1;">
                    <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Diversidad de SKUs</span>
                    <h4 style="font-size:22px; font-weight:800; color:var(--text); margin-top:4px;">${grandUniqueSkus.size} SKUs</h4>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:2px;">Referencias de productos activas</p>
                </div>
            </div>
            `;

            // Storewide summary table
            let storewideRowsHtml = '';
            Object.values(productStoreMap).forEach(item => {
                storewideRowsHtml += `
                <tr style="font-size:12px;">
                    <td style="padding:10px 12px; font-family:monospace; font-weight:600;">${item.sku}</td>
                    <td style="padding:10px 12px; font-weight:600;">${item.name}</td>
                    <td style="padding:10px 12px; color:var(--text-muted);">${item.category}</td>
                    <td style="padding:10px 12px; font-weight:700; color:var(--primary);">${item.totalUnits} U.</td>
                    <td style="padding:10px 12px;">$${item.price.toFixed(2)}</td>
                    <td style="padding:10px 12px; font-weight:700;">$${item.totalValue.toFixed(2)}</td>
                </tr>`;
            });

            let consolidatedTableHtml = `
            <div style="background:#ffffff; border:1px solid var(--border); border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.02); margin-top:12px;">
                <div style="padding:14px 18px; border-bottom:1px solid var(--border); background:#f8fafc;">
                    <h4 style="font-size:14px; font-weight:700; color:var(--text);">Consolidado General de Tienda (Fulfillment)</h4>
                </div>
                <div style="padding:12px;">
                    <table class="report-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background:#f1f5f9; border-bottom:2px solid var(--border);">
                                <th style="padding: 10px 12px; text-align:left; font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">SKU</th>
                                <th style="padding: 10px 12px; text-align:left; font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Producto</th>
                                <th style="padding: 10px 12px; text-align:left; font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Categoría</th>
                                <th style="padding: 10px 12px; text-align:left; font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Total Unidades</th>
                                <th style="padding: 10px 12px; text-align:left; font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Precio Unit.</th>
                                <th style="padding: 10px 12px; text-align:left; font-size:10px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Valor Consolidado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${storewideRowsHtml || '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">Sin datos consolidados</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            `;

            content.innerHTML = summaryCardsHtml + html + consolidatedTableHtml;
            section.style.display = 'block';
            setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

            // Bind download PDF button
            const downloadBtn = document.getElementById('btn-details-download-pdf');
            if (downloadBtn) {
                downloadBtn.onclick = () => {
                    try {
                        downloadStoreDetailsPDF(store);
                    } catch (err) {
                        console.error("PDF generation error:", err);
                        alert("Error generando el PDF. Revisa la consola.");
                    }
                };
            }

            const downloadXlsxBtn = document.getElementById('btn-details-download-xlsx');
            if (downloadXlsxBtn) {
                downloadXlsxBtn.onclick = () => {
                    try {
                        downloadStoreExcel(store, `Reporte_Consolidado_${store.name.replace(/\s+/g, '_')}`);
                    } catch (err) {
                        console.error("Excel generation error:", err);
                        alert("Error generando el archivo Excel. Revisa la consola.");
                    }
                };
            }
        } catch (error) {
            console.error("Error generating store details global report:", error);
            content.innerHTML = `<p style="color:#ef4444; text-align:center; padding:20px; font-weight:600;">Ocurrió un error al generar el reporte global: ${error.message}. Por favor, intenta de nuevo o recarga la página.</p>`;
            section.style.display = 'block';
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function downloadStoreDetailsPDF(store) {
        if (typeof window.jspdf === 'undefined') {
            alert('Falta la librería jsPDF en la página.');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4'); // Initialize with Portrait for the first layout page
        
        let isFirstPage = true;
        let grandTotalUnits = 0;
        let grandTotalValue = 0;
        let grandUniqueSkus = new Set();
        const productStoreMap = {}; // SKU -> { sku, name, category, totalUnits, price, totalValue }

        store.library.forEach((g, gIdx) => {
            if (!isFirstPage) {
                doc.addPage('a4', 'p'); // Add portrait page for the layout image
            }
            isFirstPage = false;

            // Page Header with Locatel branding colors (Portrait layout)
            doc.setFillColor(0, 150, 57);
            doc.rect(0, 0, 595, 15, 'F');

            doc.setFontSize(18);
            doc.setTextColor(0, 150, 57);
            doc.setFont('helvetica', 'bold');
            doc.text('REPORTE TÉCNICO DE PLANOGRAMA', 40, 45);

            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            doc.text(`Tienda: ${store.name.toUpperCase()} | Góndola ${gIdx + 1}: ${g.name.toUpperCase()} (${(g.config.type || 'pared').toUpperCase()})`, 40, 60);
            doc.text(`Dimensiones: ${g.config.width}x${g.config.height}x${g.config.depth} cm | Fecha: ${new Date().toLocaleString()}`, 40, 72);

            // Generate and Draw the 2D Graphic of this specific gondola (large portrait scale)
            try {
                const planogramImgData = generateGondola2DImage(g);
                const scaleCanvas = 710 / g.config.width;
                const canvasH = 120 + g.config.height * scaleCanvas;

                const displayW = 515; // 595 - 40 * 2 margin
                let imgW = displayW;
                let imgH = (canvasH / 800) * imgW;
                
                // Allow the image to use up to 665 pt of page height
                const maxImageH = 665;
                if (imgH > maxImageH) {
                    imgH = maxImageH;
                    imgW = (800 / canvasH) * imgH;
                }
                const imgX = 40 + (displayW - imgW) / 2; // Center horizontally
                const imgY = 85 + (665 - imgH) / 2; // Center vertically in the 665pt block
                doc.addImage(planogramImgData, 'JPEG', imgX, imgY, imgW, imgH);
            } catch (err) {
                console.error("Error generating gondola 2D image in PDF:", err);
                doc.setTextColor(239, 68, 68);
                doc.text("[Error cargando gráfico técnico frontal]", 40, 150);
            }

            // Build detailed table data for this specific gondola
            const tableHead = [['Estante', 'SKU', 'Producto', 'Cantidad', 'Precio Unit.', 'Valor Total']];
            const tableBody = [];
            let gondolaTotalUnits = 0;
            let gondolaTotalValue = 0;

            g.config.shelves.forEach((s, sIdx) => {
                const shelfProducts = [];
                let shelfTotalUnits = 0;
                let shelfTotalValue = 0;

                s.products.forEach(p => {
                    let layersToProcess = p.layers;
                    if (!layersToProcess && p.productId) {
                        layersToProcess = [{ productId: p.productId, facings: p.facings, orientation: p.orientation || 0 }];
                    }
                    if (!layersToProcess) return;

                    layersToProcess.forEach(layer => {
                        const product = state.getProductById(layer.productId);
                        if (!product) return;

                        const dims = state.getPlacedDimensions(layer.productId, layer.orientation || 0);
                        const unitsInZ = Math.floor(g.config.shelfDepth / dims.depth);
                        const totalUnits = layer.facings * unitsInZ;

                        let existing = shelfProducts.find(x => x.sku === product.sku);
                        if (!existing) {
                            existing = { sku: product.sku, name: product.name, units: 0, price: product.price, totalValue: 0, orientation: layer.orientation || 0, unitsInZ };
                            shelfProducts.push(existing);
                        }
                        existing.units += totalUnits;
                        existing.totalValue += (totalUnits * product.price);

                        shelfTotalUnits += totalUnits;
                        shelfTotalValue += (totalUnits * product.price);

                        gondolaTotalUnits += totalUnits;
                        gondolaTotalValue += (totalUnits * product.price);
                        grandUniqueSkus.add(product.sku);

                        grandTotalUnits += totalUnits;
                        grandTotalValue += (totalUnits * product.price);

                        // Storewide map
                        if (!productStoreMap[product.sku]) {
                            productStoreMap[product.sku] = {
                                sku: product.sku,
                                name: product.name,
                                category: product.category || 'Medicina',
                                totalUnits: 0,
                                price: product.price,
                                totalValue: 0
                            };
                        }
                        productStoreMap[product.sku].totalUnits += totalUnits;
                        productStoreMap[product.sku].totalValue += (totalUnits * product.price);
                    });
                });

                if (shelfProducts.length > 0) {
                    const isPerchero = s.type === 'perchero';
                    const levelName = isPerchero ? `Nivel ${sIdx + 1} (Perchero)` : `Nivel ${sIdx + 1} (Plancha)`;

                    shelfProducts.forEach(data => {
                        tableBody.push([
                            levelName,
                            data.sku,
                            data.name,
                            `${data.units} U.`,
                            `$${data.price.toFixed(2)}`,
                            `$${data.totalValue.toFixed(2)}`
                        ]);
                    });

                    // Add shelf subtotal row
                    tableBody.push([
                        `Subtotal ${levelName}`,
                        '', '',
                        `${shelfTotalUnits} U.`,
                        '-',
                        `$${shelfTotalValue.toFixed(2)}`
                    ]);
                }
            });

            // Add final Gondola Total row
            tableBody.push([
                `TOTAL GÓNDOLA: ${g.name.toUpperCase()}`,
                '', '',
                `${gondolaTotalUnits} U.`,
                '-',
                `$${gondolaTotalValue.toFixed(2)}`
            ]);

            // Add page for the detailed table (Portrait A4)
            doc.addPage('a4', 'p');

            // Page Header with Locatel branding colors (Portrait)
            doc.setFillColor(0, 150, 57);
            doc.rect(0, 0, 595, 15, 'F');

            doc.setFontSize(16);
            doc.setTextColor(0, 150, 57);
            doc.setFont('helvetica', 'bold');
            doc.text('DETALLE DE INVENTARIO Y CAPACIDAD', 40, 45);

            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            doc.text(`Tienda: ${store.name.toUpperCase()} | Góndola ${gIdx + 1}: ${g.name.toUpperCase()} (${(g.config.type || 'pared').toUpperCase()})`, 40, 60);

            doc.autoTable({
                head: tableHead,
                body: tableBody,
                startY: 80,
                theme: 'striped',
                headStyles: { fillColor: [0, 150, 57], fontSize: 8 },
                bodyStyles: { fontSize: 8 },
                didParseCell: function(data) {
                    const firstCell = data.row.cells[0];
                    if (firstCell && firstCell.text && firstCell.text.length > 0) {
                        const txt = firstCell.text[0] || '';
                        if (txt.indexOf('TOTAL GÓNDOLA') !== -1 || txt.indexOf('Subtotal') !== -1) {
                            data.cell.styles.fontStyle = 'bold';
                            if (txt.indexOf('TOTAL GÓNDOLA') !== -1) {
                                data.cell.styles.fillColor = [240, 253, 244];
                                data.cell.styles.textColor = [0, 120, 40];
                            }
                        }
                    }
                }
            });
        });

        // ==========================================
        // PAGE LAST: GRAND STOREWIDE SUMMARY CONSOLIDATIONS
        // ==========================================
        doc.addPage();
        
        // Green top bar
        doc.setFillColor(0, 150, 57);
        doc.rect(0, 0, 595, 15, 'F');

        // Header Title
        doc.setFontSize(22);
        doc.setTextColor(0, 150, 57);
        doc.setFont('helvetica', 'bold');
        doc.text('CONSOLIDADO GENERAL DE TIENDA', 40, 48);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tienda: ${store.name.toUpperCase()} | Total Góndolas Planificadas: ${store.library.length}`, 40, 64);
        doc.text(`Generado por: Planogram Pro Retail Analytics Suite | Fecha: ${new Date().toLocaleString()}`, 40, 76);

        // Draw Premium Stats boxes
        // Stats 1: Inventory Value
        doc.setFillColor(243, 244, 246);
        doc.setDrawColor(229, 231, 235);
        doc.rect(40, 95, 160, 60, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('VALOR INVENTARIO CONSOLIDADO', 50, 112);
        doc.setFontSize(16);
        doc.setTextColor(0, 150, 57);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${grandTotalValue.toFixed(2)}`, 50, 138);

        // Stats 2: Total Units
        doc.setFillColor(243, 244, 246);
        doc.rect(217, 95, 160, 60, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('CAPACIDAD DE STOCK TOTAL', 227, 112);
        doc.setFontSize(16);
        doc.setTextColor(255, 184, 28); // Locatel Accent Yellow/Orange
        doc.setFont('helvetica', 'bold');
        doc.text(`${grandTotalUnits} Unidades`, 227, 138);

        // Stats 3: SKUs Count
        doc.setFillColor(243, 244, 246);
        doc.rect(395, 95, 160, 60, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('DIVERSIDAD DE REFERENCIAS (SKUs)', 405, 112);
        doc.setFontSize(16);
        doc.setTextColor(99, 102, 241);
        doc.setFont('helvetica', 'bold');
        doc.text(`${grandUniqueSkus.size} SKUs Únicos`, 405, 138);

        // Draw Consolidate Table headers
        const summaryHead = [['SKU', 'Producto', 'Categoría', 'Precio Unitario', 'Total Unidades', 'Valor Consolidado']];
        const summaryBody = [];
        
        Object.values(productStoreMap).forEach(item => {
            summaryBody.push([
                item.sku,
                item.name,
                item.category,
                `$${item.price.toFixed(2)}`,
                `${item.totalUnits} U.`,
                `$${item.totalValue.toFixed(2)}`
            ]);
        });

        // Final grand totals row
        summaryBody.push([
            'TOTAL TIENDA CONSOLIDADO',
            '', '', '',
            `${grandTotalUnits} U.`,
            `$${grandTotalValue.toFixed(2)}`
        ]);

        doc.autoTable({
            head: summaryHead,
            body: summaryBody,
            startY: 175,
            theme: 'grid',
            headStyles: { fillColor: [31, 41, 55], fontSize: 9 }, // Sleek dark gray header for consolidated inventory
            bodyStyles: { fontSize: 8.5 },
            didParseCell: function(data) {
                const firstCell = data.row.cells[0];
                if (firstCell && firstCell.text && firstCell.text.length > 0) {
                    const txt = firstCell.text[0] || '';
                    if (txt.indexOf('TOTAL TIENDA CONSOLIDADO') !== -1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [243, 244, 246];
                        data.cell.styles.textColor = [16, 185, 129];
                    }
                }
            }
        });

        doc.save(`Reporte_Consolidado_Tienda_${store.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    }

    function generateReport() {
        const reportContent = document.getElementById('report-content');
        
        try {
            let html = '<table class="report-table" id="report-table" style="width: 100%; border-collapse: collapse;"><thead><tr style="background: var(--primary); color: white;"><th>SKU</th><th>Nombre</th><th>Cantidad</th><th>Precio Unit.</th><th>Valor Total</th></tr></thead><tbody>';
            
            let grandTotalUnits = 0;
            let grandTotalValue = 0;
            let grandUniqueSkus = new Set();

            if (!state.gondola || !state.gondola.shelves) {
                reportContent.innerHTML = '<p style="text-align: center; padding: 20px;">No hay información de góndola.</p>';
                return;
            }

            state.gondola.shelves.forEach((s, sIdx) => {
                if (!s || !s.products) return;
                const shelfProducts = [];
                let shelfTotalUnits = 0;
                let shelfTotalValue = 0;

                s.products.forEach(p => {
                    if (!p) return;
                    let layersToProcess = p.layers;
                    if (!layersToProcess) {
                        if (p.productId) {
                            layersToProcess = [];
                            for(let i=0; i < (p.stacks || 1); i++) {
                                layersToProcess.push({ productId: p.productId, facings: p.facings || 1, orientation: p.orientation || 0 });
                            }
                        } else {
                            return;
                        }
                    }

                    layersToProcess.forEach(layer => {
                        if (!layer || !layer.productId) return;
                        const product = state.getProductById(layer.productId);
                        if (!product) return;
                        
                        const dims = state.getPlacedDimensions(layer.productId, layer.orientation || 0);
                        if (!dims || !dims.depth || dims.depth <= 0) return;

                        const unitsInZ = Math.floor(state.gondola.shelfDepth / dims.depth);
                        const totalUnits = (layer.facings || 1) * unitsInZ;
                        
                        let existing = shelfProducts.find(x => x.sku === product.sku);
                        if (!existing) {
                            existing = { sku: product.sku, name: product.name, units: 0, price: product.price, totalValue: 0 };
                            shelfProducts.push(existing);
                        }
                        
                        existing.units += totalUnits;
                        existing.totalValue += (totalUnits * product.price);
                        
                        shelfTotalUnits += totalUnits;
                        shelfTotalValue += (totalUnits * product.price);
                        
                        grandTotalUnits += totalUnits;
                        grandTotalValue += (totalUnits * product.price);
                        grandUniqueSkus.add(product.sku);
                    });
                });

                if (shelfProducts.length > 0) {
                    const isPerchero = s.type === 'perchero';
                    const levelName = isPerchero ? `Nivel ${sIdx + 1} (Perchero)` : `Nivel ${sIdx + 1} (Plancha)`;
                    
                    html += `<tr style="background: var(--primary-light); font-weight: 700;">
                        <td colspan="5" style="padding: 8px; border-bottom: 1px solid var(--border); color: var(--primary); text-align: left;">
                            ${levelName}
                        </td>
                    </tr>`;
                    
                    shelfProducts.forEach(data => {
                        html += `<tr>
                            <td>${data.sku}</td>
                            <td>${data.name}</td>
                            <td>${data.units}</td>
                            <td>$${data.price.toFixed(2)}</td>
                            <td>$${data.totalValue.toFixed(2)}</td>
                        </tr>`;
                    });
                    
                    html += `<tr style="font-weight: 600; font-size: 0.9em; background: rgba(0,0,0,0.02);">
                        <td colspan="2" style="text-align: right; padding-right: 16px; color: var(--text-muted);">Subtotal ${levelName}:</td>
                        <td>${shelfTotalUnits}</td>
                        <td>-</td>
                        <td>$${shelfTotalValue.toFixed(2)}</td>
                    </tr>`;
                }
            });

            if (grandTotalUnits === 0) {
                 html += `<tr><td colspan="5" style="text-align: center; padding: 20px;">No hay productos en esta góndola.</td></tr>`;
            }

            html += `<tr style="font-weight: bold; background: var(--primary); color: white; border-top: 2px solid var(--primary-hover);">
                <td colspan="2" style="text-align: right; padding-right: 16px;">TOTAL GLOBAL (${grandUniqueSkus.size} SKUs Únicos)</td>
                <td>${grandTotalUnits}</td>
                <td>-</td>
                <td>$${grandTotalValue.toFixed(2)}</td>
            </tr>`;

            html += '</tbody></table>';
            reportContent.innerHTML = html;
        } catch (error) {
            console.error("Error generating detailed report:", error);
            reportContent.innerHTML = `<p style="color:#ef4444; text-align:center; padding:20px; font-weight:600;">Ocurrió un error al generar el informe: ${error.message}. Por favor, intenta de nuevo o recarga la página.</p>`;
        }
    }

    function buildGondolaProductSummary(gondola) {
        const summary = {};
        let grandTotalUnits = 0;
        let grandTotalValue = 0;
        const uniqueSkus = new Set();

        gondola.shelves.forEach(shelf => {
            shelf.products.forEach(p => {
                let layersToProcess = p.layers;
                if (!layersToProcess && p.productId) {
                    layersToProcess = [];
                    for (let i = 0; i < (p.stacks || 1); i++) {
                        layersToProcess.push({ productId: p.productId, facings: p.facings, orientation: p.orientation || 0 });
                    }
                }
                if (!layersToProcess) return;

                layersToProcess.forEach(layer => {
                    const product = state.getProductById(layer.productId);
                    if (!product) return;

                    const dims = state.getPlacedDimensions(layer.productId, layer.orientation || 0);
                    const unitsInZ = Math.floor(gondola.shelfDepth / dims.depth);
                    const totalUnits = layer.facings * unitsInZ;

                    if (!summary[product.sku]) {
                        summary[product.sku] = {
                            sku: product.sku,
                            name: product.name,
                            category: product.category || '',
                            units: 0,
                            price: product.price,
                            totalValue: 0
                        };
                    }
                    summary[product.sku].units += totalUnits;
                    summary[product.sku].totalValue += totalUnits * product.price;
                    grandTotalUnits += totalUnits;
                    grandTotalValue += totalUnits * product.price;
                    uniqueSkus.add(product.sku);
                });
            });
        });

        const rows = Object.values(summary);
        return { rows, grandTotalUnits, grandTotalValue, uniqueSkusCount: uniqueSkus.size };
    }

    function buildStoreProductSummary(store) {
        const summary = {};
        let grandTotalUnits = 0;
        let grandTotalValue = 0;
        const uniqueSkus = new Set();

        store.library.forEach(gondola => {
            gondola.config.shelves.forEach(shelf => {
                shelf.products.forEach(p => {
                    let layersToProcess = p.layers;
                    if (!layersToProcess && p.productId) {
                        layersToProcess = [];
                        for (let i = 0; i < (p.stacks || 1); i++) {
                            layersToProcess.push({ productId: p.productId, facings: p.facings, orientation: p.orientation || 0 });
                        }
                    }
                    if (!layersToProcess) return;

                    layersToProcess.forEach(layer => {
                        const product = state.getProductById(layer.productId);
                        if (!product) return;

                        const dims = state.getPlacedDimensions(layer.productId, layer.orientation || 0);
                        const unitsInZ = Math.floor(gondola.config.shelfDepth / dims.depth);
                        const totalUnits = layer.facings * unitsInZ;

                        if (!summary[product.sku]) {
                            summary[product.sku] = {
                                sku: product.sku,
                                name: product.name,
                                category: product.category || '',
                                units: 0,
                                price: product.price,
                                totalValue: 0
                            };
                        }
                        summary[product.sku].units += totalUnits;
                        summary[product.sku].totalValue += totalUnits * product.price;
                        grandTotalUnits += totalUnits;
                        grandTotalValue += totalUnits * product.price;
                        uniqueSkus.add(product.sku);
                    });
                });
            });
        });

        return { rows: Object.values(summary), grandTotalUnits, grandTotalValue, uniqueSkusCount: uniqueSkus.size };
    }

    function downloadExcelWorkbook(sheetName, rows, filename, storeName = '') {
        if (typeof window.XLSX === 'undefined') {
            alert('Falta la librería XLSX en la página.');
            return;
        }
        const header = ['SKU', 'Nombre', 'Categoría', 'Cantidad', 'Precio Unitario', 'Valor Total'];
        const aoa = [
            [`Tienda: ${storeName}`],
            [],
            header
        ];
        rows.forEach(row => aoa.push([row.sku, row.name, row.category || '', row.units, row.price, row.totalValue]));

        const totals = rows.reduce((acc, item) => {
            acc.units += item.units;
            acc.totalValue += item.totalValue;
            return acc;
        }, { units: 0, totalValue: 0 });

        aoa.push(['TOTAL GENERAL', '', '', totals.units, '', totals.totalValue]);

        const ws = window.XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [{ wch: 16 }, { wch: 40 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 16 }];
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Reporte');
        window.XLSX.writeFile(wb, `${filename || 'Reporte'}_${Date.now()}.xlsx`);
    }

    function downloadCurrentGondolaExcel() {
        const summary = buildGondolaProductSummary(state.gondola);
        if (summary.rows.length === 0) {
            alert('No hay productos en el planograma actual para exportar.');
            return;
        }
        const activeStore = state.stores.find(s => s.id === state.currentStoreId);
        const storeName = activeStore ? activeStore.name : '';
        downloadExcelWorkbook('Góndola', summary.rows, `Reporte_Planograma_${(state.gondola.type || 'gondola').replace(/\s+/g, '_')}`, storeName);
    }

    function downloadStoreExcel(store, filename) {
        const summary = buildStoreProductSummary(store);
        if (summary.rows.length === 0) {
            alert('No hay productos en la tienda para exportar.');
            return;
        }
        downloadExcelWorkbook('Tienda', summary.rows, filename, store.name || '');
    }

    function generateGondola2DImage(gondolaOverride = null) {
        const originalGondola = state.gondola;
        let tempGondola = null;
        let tempName = 'Góndola';
        
        if (gondolaOverride) {
            if (gondolaOverride.config) {
                tempGondola = gondolaOverride.config;
                tempName = gondolaOverride.name || 'Góndola';
            } else {
                tempGondola = gondolaOverride;
                tempName = gondolaOverride.name || 'Góndola';
            }
            state.gondola = tempGondola;
        } else {
            const activeGondola = state.library.find(p => p.id === state.currentGondolaId);
            tempName = activeGondola ? activeGondola.name : 'Góndola';
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const g = state.gondola;
        
        // Helper to adjust color brightness
        function adjustColor(colorStr, amt) {
            let hex = String(colorStr).replace('#', '');
            if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
            let num = parseInt(hex, 16);
            if (isNaN(num)) return colorStr;
            let r = (num >> 16) + amt;
            let gVal = ((num >> 8) & 0x00FF) + amt;
            let b = (num & 0x0000FF) + amt;
            r = Math.min(255, Math.max(0, r));
            gVal = Math.min(255, Math.max(0, gVal));
            b = Math.min(255, Math.max(0, b));
            return '#' + ((1 << 24) + (r << 16) + (gVal << 8) + b).toString(16).slice(1);
        }

        // Layout bounds
        const canvasW = 800;
        const gondolaX = 50; // left margin for height dimension
        const gondolaY = 60; // top margin for header/legend
        const availableW = canvasW - gondolaX - 40; // right margin
        const scale = availableW / g.width; // scale pixels per cm
        const gondolaH = g.height * scale;
        const canvasH = gondolaY + gondolaH + 60; // bottom margin for width dimension
        
        canvas.width = canvasW;
        canvas.height = canvasH;
        
        // Fill canvas background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);
        
        const gondolaName = tempName;

        // 1. Draw Title
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 14px "Outfit", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`VISTA FRONTAL TÉCNICA: ${gondolaName.toUpperCase()}`, gondolaX, 15);
        
        ctx.fillStyle = '#64748b';
        ctx.font = 'normal 9px Inter, sans-serif';
        ctx.fillText(`Tipo: ${(g.type || 'Pared').toUpperCase()} | Profundidad: ${g.shelfDepth || 0}cm`, gondolaX, 32);

        // 2. Draw metallic uprights (postes laterales)
        const uprightL = ctx.createLinearGradient(gondolaX - 12, 0, gondolaX, 0);
        uprightL.addColorStop(0, '#94a3b8');
        uprightL.addColorStop(0.4, '#f1f5f9');
        uprightL.addColorStop(1, '#64748b');
        ctx.fillStyle = uprightL;
        ctx.fillRect(gondolaX - 12, gondolaY, 12, gondolaH);
        
        const uprightR = ctx.createLinearGradient(gondolaX + availableW, 0, gondolaX + availableW + 12, 0);
        uprightR.addColorStop(0, '#64748b');
        uprightR.addColorStop(0.4, '#f1f5f9');
        uprightR.addColorStop(1, '#94a3b8');
        ctx.fillStyle = uprightR;
        ctx.fillRect(gondolaX + availableW, gondolaY, 12, gondolaH);

        // 3. Draw gondola backboard
        const typeColors = {
            pared: '#f8fafc',
            central: '#ffffff',
            cabecera: '#fdfdfd',
            refrigerado: '#f0f9ff'
        };
        ctx.fillStyle = typeColors[g.type] || '#f8fafc';
        ctx.fillRect(gondolaX, gondolaY, availableW, gondolaH);
        
        // If refrigeration, draw standard blue glass shelf frames
        if (g.type === 'refrigerado') {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
            ctx.fillRect(gondolaX, gondolaY, availableW, gondolaH);
        }

        // Draw pegboard panel backboard
        g.shelves.forEach((s, sIdx) => {
            if (s.type === 'perchero') {
                const usableH = state.getShelfUsableHeight(sIdx);
                const sYCanvas = gondolaY + gondolaH - (s.y * scale);
                const pegboardH = usableH * scale;
                const pegboardY = sYCanvas - pegboardH;
                
                ctx.fillStyle = '#f1f5f9';
                ctx.fillRect(gondolaX, pegboardY, availableW, pegboardH);
                
                // Pegboard hole pattern
                ctx.fillStyle = '#cbd5e1';
                for (let x = gondolaX + 8; x < gondolaX + availableW; x += 16) {
                    for (let y = pegboardY + 8; y < pegboardY + pegboardH; y += 16) {
                        ctx.beginPath();
                        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        });
        
        // 4. Draw placed products (with premium gloss and detail)
        g.shelves.forEach((s, sIdx) => {
            const isPerchero = s.type === 'perchero';
            const sYCanvas = gondolaY + gondolaH - (s.y * scale);
            const shelfThicknessPx = (isPerchero ? 1 : g.shelfThickness) * scale;
            
            s.products.forEach(p => {
                let layersToProcess = p.layers || [];
                let currentY = 0;
                
                layersToProcess.forEach((layer, lIdx) => {
                    const product = state.getProductById(layer.productId);
                    if (!product) return;
                    
                    const dims = state.getPlacedDimensions(layer.productId, layer.orientation || 0);
                    const pWidthPx = dims.width * scale * layer.facings;
                    const pHeightPx = dims.height * scale;
                    const pXPx = gondolaX + (p.x * scale);
                    
                    // Placement height adjustment
                    const baseOffset = isPerchero ? (dims.height * 0.15) * scale : shelfThicknessPx;
                    const pYPx = sYCanvas - baseOffset - (currentY * scale) - pHeightPx;
                    
                    // Draw each facing with its gloss gradient
                    const singleWidthPx = dims.width * scale;
                    for (let f = 0; f < layer.facings; f++) {
                        const faceXPx = pXPx + f * singleWidthPx;
                        
                        // Glossy vertical gradient
                        const grad = ctx.createLinearGradient(faceXPx, pYPx, faceXPx, pYPx + pHeightPx);
                        const baseCol = product.color || '#3b82f6';
                        grad.addColorStop(0, adjustColor(baseCol, 40));
                        grad.addColorStop(0.25, baseCol);
                        grad.addColorStop(0.85, adjustColor(baseCol, -15));
                        grad.addColorStop(1, adjustColor(baseCol, -30));
                        
                        ctx.fillStyle = grad;
                        ctx.fillRect(faceXPx, pYPx, singleWidthPx, pHeightPx);
                        
                        // Thin dark border for the product container
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(faceXPx, pYPx, singleWidthPx, pHeightPx);
                        
                        // Premium inner glow effect (light reflection)
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(faceXPx + 1, pYPx + 1, singleWidthPx - 2, pHeightPx - 2);
                        
                        // Top Cap/Lid design (to make it look like actual shampoo/medicine/beverage bottle)
                        if (singleWidthPx > 8 && pHeightPx > 20) {
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                            ctx.fillRect(faceXPx + 2, pYPx, singleWidthPx - 4, 3);
                        }
                    }
                    
                    // Draw SKU label centered on the total block
                    if (pWidthPx > 22 && pHeightPx > 10) {
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 8px "Outfit", sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        // High-contrast text outline
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
                        ctx.lineWidth = 3;
                        ctx.strokeText(product.sku, pXPx + pWidthPx / 2, pYPx + pHeightPx / 2);
                        ctx.fillText(product.sku, pXPx + pWidthPx / 2, pYPx + pHeightPx / 2);
                    }
                    
                    currentY += dims.height;
                });
            });
        });
        
        // 5. Draw shelf plates (planchas) with bevel 3D look
        g.shelves.forEach((s, sIdx) => {
            const isPerchero = s.type === 'perchero';
            const sYCanvas = gondolaY + gondolaH - (s.y * scale);
            const shelfThicknessPx = (isPerchero ? 1 : g.shelfThickness) * scale;
            if (isPerchero) {
                // Perchero bar
                ctx.fillStyle = '#475569';
                ctx.fillRect(gondolaX, sYCanvas - shelfThicknessPx, availableW, shelfThicknessPx);

                // Draw static hook points on 2D canvas
                const spacing = s.hookSpacing || 15;
                const numHooks = Math.floor(g.width / spacing);
                const margin = (g.width - (numHooks - 1) * spacing) / 2;
                
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 2;
                for (let i = 0; i < numHooks; i++) {
                    const hX = gondolaX + (margin + i * spacing) * scale;
                    // Draw a small metallic hook node
                    ctx.beginPath();
                    ctx.arc(hX, sYCanvas, 1.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#cbd5e1';
                    ctx.fill();
                    ctx.stroke();
                }
            } else {
                // Premium steel gradient for plancha shelf
                const shelfGrad = ctx.createLinearGradient(0, sYCanvas - shelfThicknessPx, 0, sYCanvas);
                shelfGrad.addColorStop(0, '#e2e8f0'); // bright steel top
                shelfGrad.addColorStop(0.3, '#94a3b8');
                shelfGrad.addColorStop(0.7, '#475569');
                shelfGrad.addColorStop(1, '#334155'); // dark bottom shadow
                
                ctx.fillStyle = shelfGrad;
                ctx.fillRect(gondolaX, sYCanvas - shelfThicknessPx, availableW, shelfThicknessPx);
                
                // Colorful price tag label strip (porta-precios)
                ctx.fillStyle = '#009639'; // Clean Locatel green price tag holder strip!
                ctx.fillRect(gondolaX, sYCanvas - Math.max(3, shelfThicknessPx * 0.4), availableW, Math.max(2, shelfThicknessPx * 0.35));
                
                // Small metallic brackets on the left/right corners
                ctx.fillStyle = '#64748b';
                ctx.fillRect(gondolaX - 2, sYCanvas - shelfThicknessPx, 2, shelfThicknessPx + 2);
                ctx.fillRect(gondolaX + availableW, sYCanvas - shelfThicknessPx, 2, shelfThicknessPx + 2);
            }
            
            // Shelf index label in white bold text inside the shelf
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(isPerchero ? `PERCHERO N${sIdx+1}` : `PLANCHA N${sIdx+1}`, gondolaX + 8, sYCanvas - shelfThicknessPx/2);
        });

        // 6. Draw professional Dimension Lines (Líneas de Cota)
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#475569';
        
        // A. Width Dimension Line (Bottom)
        const dimY = canvasH - 30;
        ctx.beginPath();
        // Main line
        ctx.moveTo(gondolaX, dimY);
        ctx.lineTo(gondolaX + availableW, dimY);
        // Extension lines
        ctx.moveTo(gondolaX, dimY - 10);
        ctx.lineTo(gondolaX, dimY + 5);
        ctx.moveTo(gondolaX + availableW, dimY - 10);
        ctx.lineTo(gondolaX + availableW, dimY + 5);
        ctx.stroke();
        
        // Draw arrows
        drawArrow(ctx, gondolaX, dimY, 5, 'left');
        drawArrow(ctx, gondolaX + availableW, dimY, 5, 'right');
        
        // Center text label
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textLabel = `${g.width} cm`;
        const textWidth = ctx.measureText(textLabel).width + 10;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(gondolaX + availableW/2 - textWidth/2, dimY - 8, textWidth, 16);
        ctx.fillStyle = '#1e293b';
        ctx.fillText(textLabel, gondolaX + availableW/2, dimY);

        // B. Height Dimension Line (Left side)
        const dimX = 20;
        ctx.beginPath();
        ctx.moveTo(dimX, gondolaY);
        ctx.lineTo(dimX, gondolaY + gondolaH);
        // Extension lines
        ctx.moveTo(dimX - 5, gondolaY);
        ctx.lineTo(dimX + 10, gondolaY);
        ctx.moveTo(dimX - 5, gondolaY + gondolaH);
        ctx.lineTo(dimX + 10, gondolaY + gondolaH);
        ctx.stroke();
        
        // Draw height arrows
        drawArrow(ctx, dimX, gondolaY, 5, 'up');
        drawArrow(ctx, dimX, gondolaY + gondolaH, 5, 'down');
        
        // Rotated vertical height label
        ctx.save();
        ctx.translate(dimX + 8, gondolaY + gondolaH/2);
        ctx.rotate(-Math.PI/2);
        ctx.fillStyle = '#ffffff';
        const heightLabel = `${g.height} cm`;
        const hTextW = ctx.measureText(heightLabel).width + 8;
        ctx.fillRect(-hTextW/2, -8, hTextW, 16);
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(heightLabel, 0, 0);
        ctx.restore();

        // 7. Outer board border
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, canvasW, canvasH);
        
        if (gondolaOverride) {
            state.gondola = originalGondola;
        }
        return canvas.toDataURL('image/jpeg', 0.95);
    }

    // Arrow drawing helper
    function drawArrow(ctx, x, y, size, dir) {
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        if (dir === 'left') {
            ctx.moveTo(x, y);
            ctx.lineTo(x + size * 1.5, y - size);
            ctx.lineTo(x + size * 1.5, y + size);
        } else if (dir === 'right') {
            ctx.moveTo(x, y);
            ctx.lineTo(x - size * 1.5, y - size);
            ctx.lineTo(x - size * 1.5, y + size);
        } else if (dir === 'up') {
            ctx.moveTo(x, y);
            ctx.lineTo(x - size, y + size * 1.5);
            ctx.lineTo(x + size, y + size * 1.5);
        } else if (dir === 'down') {
            ctx.moveTo(x, y);
            ctx.lineTo(x - size, y - size * 1.5);
            ctx.lineTo(x + size, y - size * 1.5);
        }
        ctx.closePath();
        ctx.fill();
    }

    function downloadPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4'); // Initialize with Portrait for the first layout page
        
        const activeGondola = state.library.find(p => p.id === state.currentGondolaId);
        const gondolaName = activeGondola ? activeGondola.name : 'Góndola';
        
        // Page 1 Header - Compact & Elegant Corporate Design (Portrait)
        doc.setFillColor(0, 150, 57);
        doc.rect(0, 0, 595, 15, 'F');

        doc.setFontSize(22);
        doc.setTextColor(0, 150, 57); // Locatel Green
        doc.text('REPORTE DE PLANOGRAMA', 40, 45);
        const activeStore = state.stores.find(s => s.id === state.currentStoreId);
        const storeName = activeStore ? activeStore.name : 'Tienda';
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Tienda: ${storeName}`, 40, 62);
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Mueble: ${gondolaName} (${(state.gondola.type || 'Pared').toUpperCase()}) | Dim: ${state.gondola.width || 0}x${state.gondola.height || 0}x${state.gondola.shelfDepth || 0} cm | Fecha: ${new Date().toLocaleString()}`, 40, 80);
        
        // Add 2D Planogram Image
        const planogramImgData = generateGondola2DImage();
        
        // Calculate canvas height
        const canvasScale = 710 / (state.gondola.width || 100);
        const canvasH = 120 + (state.gondola.height || 100) * canvasScale;

        // Calculate portrait printable space
        const displayW = 515; // 595 - 40 * 2 margin
        let finalW = displayW;
        let finalH = (canvasH / 800) * finalW;
        
        const maxImageH = 665; // 842 - 85 - 40 - 52
        if (finalH > maxImageH) {
            finalH = maxImageH;
            finalW = (800 / canvasH) * finalH;
        }
        
        // Centered position inside the remaining area
        const imgX = 40 + (displayW - finalW) / 2;
        const imgY = 85 + (665 - finalH) / 2;
        doc.addImage(planogramImgData, 'JPEG', imgX, imgY, finalW, finalH);

        // Add Page 2 for Detailed Table (Portrait)
        doc.addPage('a4', 'p');

        doc.setFillColor(0, 150, 57);
        doc.rect(0, 0, 595, 15, 'F');

        doc.setFontSize(16);
        doc.setTextColor(0, 150, 57);
        doc.text('DETALLE DE INVENTARIO Y CAPACIDAD', 40, 45);
        
        doc.autoTable({
            html: '#report-table',
            startY: 65,
            theme: 'grid',
            headStyles: { fillColor: [0, 150, 57] },
            styles: { fontSize: 9 },
            didParseCell: function(data) {
                const firstCell = data.row.cells[0];
                if (firstCell && firstCell.text && firstCell.text.length > 0) {
                    const txt = (firstCell.text[0] || '').trim();
                    if (txt.indexOf('Góndola:') === 0) {
                        data.cell.styles.fillColor = [217, 238, 225];
                        data.cell.styles.textColor = [31, 41, 55];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (txt.indexOf('Nivel ') === 0) {
                        data.cell.styles.fillColor = [240, 253, 244];
                        data.cell.styles.textColor = [0, 150, 57];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (txt.indexOf('Subtotal ') === 0) {
                        data.cell.styles.fillColor = [249, 250, 251];
                        data.cell.styles.textColor = [107, 114, 128];
                        data.cell.styles.fontStyle = 'bold';
                        if (data.column.index === 0) {
                            data.cell.styles.halign = 'right';
                        }
                    } else if (txt.indexOf('Total ') === 0) {
                        data.cell.styles.fillColor = [235, 247, 239];
                        data.cell.styles.textColor = [0, 150, 57];
                        data.cell.styles.fontStyle = 'bold';
                        if (data.column.index === 0) {
                            data.cell.styles.halign = 'right';
                        }
                    } else if (txt.indexOf('TOTAL GLOBAL') === 0) {
                        data.cell.styles.fillColor = [0, 150, 57];
                        data.cell.styles.textColor = [255, 255, 255];
                        data.cell.styles.fontStyle = 'bold';
                        if (data.column.index === 0) {
                            data.cell.styles.halign = 'right';
                        }
                    }
                }
            }
        });
        
        doc.save(`Reporte_Planograma_${gondolaName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    }

    let currentModalTarget = null;

    function openProductModal(product, layer, shelfIdx, pIdx, unitsInZ, dims, lIdx) {
        currentModalTarget = { shelfIdx, pIdx, lIdx };
        document.getElementById('modal-product-name').innerText = product.name;
        document.getElementById('modal-product-y').innerText = "Capa " + (lIdx + 1);
        document.getElementById('modal-product-z').innerText = unitsInZ;
        
        const inputFacings = document.getElementById('input-modal-facings');
        if (inputFacings) {
            inputFacings.value = layer.facings;
        }
        
        document.getElementById('product-details-modal').style.display = 'grid';
    }

    document.getElementById('close-product-modal').addEventListener('click', () => {
        document.getElementById('product-details-modal').style.display = 'none';
        currentModalTarget = null;
    });

    document.getElementById('btn-modal-rotate-product').addEventListener('click', () => {
        if (currentModalTarget) {
            const result = state.rotateProduct(currentModalTarget.shelfIdx, currentModalTarget.pIdx, currentModalTarget.lIdx);
            if (!result.success) alert(result.reason || 'No se puede rotar.');
            document.getElementById('product-details-modal').style.display = 'none';
            currentModalTarget = null;
        }
    });

    document.getElementById('btn-modal-delete-product').addEventListener('click', () => {
        if (currentModalTarget) {
            state.removeFromShelf(currentModalTarget.shelfIdx, currentModalTarget.pIdx, currentModalTarget.lIdx);
            document.getElementById('product-details-modal').style.display = 'none';
            currentModalTarget = null;
        }
    });

    // Stepper facings controls
    const updateModalFacings = (newVal) => {
        if (!currentModalTarget) return;
        const input = document.getElementById('input-modal-facings');
        const val = Math.max(1, parseInt(newVal) || 1);
        const result = state.updateProductFacings(currentModalTarget.shelfIdx, currentModalTarget.pIdx, currentModalTarget.lIdx, val);
        if (!result.success) {
            alert(result.reason || 'No hay espacio suficiente.');
            if (input) {
                const shelf = state.gondola.shelves[currentModalTarget.shelfIdx];
                const p = shelf.products[currentModalTarget.pIdx];
                const layer = p.layers[currentModalTarget.lIdx];
                input.value = layer.facings;
            }
        } else {
            if (input) input.value = val;
        }
    };

    const decBtn = document.getElementById('btn-modal-dec-facings');
    const incBtn = document.getElementById('btn-modal-inc-facings');
    const facingsInput = document.getElementById('input-modal-facings');

    if (decBtn) {
        decBtn.addEventListener('click', () => {
            if (facingsInput) {
                const currentVal = parseInt(facingsInput.value) || 1;
                updateModalFacings(currentVal - 1);
            }
        });
    }

    if (incBtn) {
        incBtn.addEventListener('click', () => {
            if (facingsInput) {
                const currentVal = parseInt(facingsInput.value) || 1;
                updateModalFacings(currentVal + 1);
            }
        });
    }

    if (facingsInput) {
        facingsInput.addEventListener('change', (e) => {
            updateModalFacings(e.target.value);
        });
    }

    // Close modal if clicked outside the card
    document.getElementById('product-details-modal').addEventListener('click', (e) => {
        if (e.target.id === 'product-details-modal') {
            document.getElementById('product-details-modal').style.display = 'none';
            currentModalTarget = null;
        }
    });

    init();
});

// --- Gestión de Cierre de Paneles ---

document.addEventListener('DOMContentLoaded', () => {
    
    // Función genérica para ocultar cualquier panel por su ID
    const ocultarPanel = (idPanel) => {
        const panel = document.getElementById(idPanel);
        if (panel) {
            panel.style.display = 'none';
        } else {
            console.warn(`No se encontró el panel con ID: ${idPanel}`);
        }
    };

    // Botón 1: Cerrar reporte de detalles
    const btnCloseDetails = document.getElementById('btn-close-details-report');
    if (btnCloseDetails) {
        btnCloseDetails.addEventListener('click', () => {
            // Aquí ponemos el ID que encontraste:
            ocultarPanel('details-report-section'); 
        });
    }

    // Botón 2: Cerrar reporte inline
    const btnCloseInline = document.getElementById('btn-close-inline-report');
    if (btnCloseInline) {
        btnCloseInline.addEventListener('click', () => {
            ocultarPanel('inline-report-section');
        });
    }
});