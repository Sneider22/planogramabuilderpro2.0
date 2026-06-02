document.addEventListener('DOMContentLoaded', () => {
    const authKey = 'planogram_logged_in';
    
    // Check session
    if (localStorage.getItem(authKey) !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    const state = new AppState();
    const calculator = new SpaceCalculator(state);

    const storeId = localStorage.getItem('planogram_store_id');
    if (!storeId) {
        window.location.href = 'stores.html';
        return;
    }

    // Select the current store in state
    state.selectStore(storeId);
    const store = state.stores.find(s => s.id === storeId);
    if (!store) {
        window.location.href = 'stores.html';
        return;
    }

    // Render Store Name
    document.getElementById('details-store-name').innerText = store.name;

    // --- Dom Elements ---
    const btnBack = document.getElementById('btn-back-to-stores-list');
    const btnLogout = document.getElementById('btn-logout-details');
    const btnCreateGondola = document.getElementById('btn-create-gondola');
    const btnGlobalReport = document.getElementById('btn-global-report');
    
    const createGondolaModal = document.getElementById('create-gondola-modal');
    const editGondolaModal = document.getElementById('edit-gondola-modal');
    const detailsReportSection = document.getElementById('details-report-section');
    const detailsReportContent = document.getElementById('details-report-content');

    // --- Back to stores list ---
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.location.href = 'stores.html';
        });
    }

    // --- Logout ---
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem(authKey);
            window.location.href = 'login.html';
        });
    }

    // --- Create Gondola Modal ---
    if (btnCreateGondola) {
        btnCreateGondola.addEventListener('click', () => {
            document.getElementById('new-gondola-name').value = '';
            document.getElementById('new-gondola-aisle').value = '';
            const cat = document.getElementById('new-gondola-category');
            if (cat) cat.value = '';
            const desc = document.getElementById('new-gondola-description');
            if (desc) desc.value = '';
            createGondolaModal.style.display = 'flex';
            document.getElementById('new-gondola-name').focus();
        });
    }

    document.getElementById('btn-close-gondola-modal-x').addEventListener('click', () => {
        createGondolaModal.style.display = 'none';
    });
    document.getElementById('btn-cancel-create-gondola').addEventListener('click', () => {
        createGondolaModal.style.display = 'none';
    });

    document.getElementById('btn-confirm-create-gondola').addEventListener('click', () => {
        const name = document.getElementById('new-gondola-name').value.trim();
        const aisle = document.getElementById('new-gondola-aisle').value.trim();
        const categorySelect = document.getElementById('new-gondola-category');
        const category = categorySelect ? categorySelect.value : '';
        const descInput = document.getElementById('new-gondola-description');
        const description = descInput ? descInput.value.trim() : '';
        if (name) {
            state.createNewGondola(name, aisle, category, description);
            createGondolaModal.style.display = 'none';
            renderStoreDetails();
        } else {
            alert('El nombre de la góndola es requerido.');
        }
    });

    // --- Edit Gondola Modal ---
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
        const categorySelect = document.getElementById('edit-gondola-category');
        const category = categorySelect ? categorySelect.value : '';
        const descInput = document.getElementById('edit-gondola-description');
        const description = descInput ? descInput.value.trim() : '';
        if (name && id) {
            state.renameGondola(id, name, aisle, category, description);
            editGondolaModal.style.display = 'none';
            renderStoreDetails();
        } else {
            alert('El nombre es requerido.');
        }
    });

    // --- Global Report ---
    if (btnGlobalReport) {
        btnGlobalReport.addEventListener('click', () => {
            const freshStore = state.stores.find(s => s.id === storeId);
            generateStoreDetailsGlobalReport(freshStore || store);
        });
    }

    document.getElementById('btn-close-details-report').addEventListener('click', () => {
        detailsReportSection.style.display = 'none';
    });

    // Close modals on overlay click
    [createGondolaModal, editGondolaModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    });

    // --- Delete Gondola Confirmation Modal ---
    const deleteGondolaConfirmModal = document.getElementById('delete-gondola-confirm-modal');
    if (deleteGondolaConfirmModal) {
        document.getElementById('btn-cancel-delete-gondola-modal').addEventListener('click', () => {
            deleteGondolaConfirmModal.style.display = 'none';
        });
        document.getElementById('btn-close-delete-gondola-modal-x').addEventListener('click', () => {
            deleteGondolaConfirmModal.style.display = 'none';
        });
        document.getElementById('btn-confirm-delete-gondola').addEventListener('click', () => {
            const gondolaId = deleteGondolaConfirmModal.dataset.gondolaId;
            if (gondolaId) {
                state.deleteGondola(gondolaId);
                deleteGondolaConfirmModal.style.display = 'none';
                renderStoreDetails();
            }
        });
        deleteGondolaConfirmModal.addEventListener('click', (e) => {
            if (e.target === deleteGondolaConfirmModal) {
                deleteGondolaConfirmModal.style.display = 'none';
            }
        });
    }

    // --- Render Gondolas ---
    function renderStoreDetails() {
        const gondolaList = document.getElementById('gondola-list');
        if (!gondolaList) return;
        gondolaList.innerHTML = '';
        const currentStore = state.stores.find(s => s.id === storeId);
        
        if (!currentStore || !currentStore.library || currentStore.library.length === 0) {
            gondolaList.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align:center; padding: 40px;">No hay góndolas en esta tienda. Crea una nueva.</p>';
            return;
        }

        // Group gondolas by aisle
        const groups = {};
        let hasAisles = false;
        currentStore.library.forEach(g => {
            const aisle = (g.aisle || '').trim();
            if (aisle !== '') {
                hasAisles = true;
            }
            if (!groups[aisle]) {
                groups[aisle] = [];
            }
            groups[aisle].push(g);
        });

        // Sort aisles: alphabetically first, empty aisle ("") at the end
        const sortedAisles = Object.keys(groups).sort((a, b) => {
            if (a === '') return 1;
            if (b === '') return -1;
            return a.localeCompare(b);
        });

        sortedAisles.forEach(aisle => {
            const gondolasInAisle = groups[aisle];
            if (gondolasInAisle.length === 0) return;

            // If there's at least one aisle registered, render group header
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
                                            const shelfDepth = shelf.depth !== undefined ? shelf.depth : g.config.shelfDepth;
                                            totalUnits += (layer.facings || 1) * Math.floor(shelfDepth / dims.depth);
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
                    const currentShelfDepth = shelf.depth !== undefined ? shelf.depth : g.config.shelfDepth;
                    const miniShelfDepth = (isPerchero ? 2 : currentShelfDepth) * scaleMini;

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
                                    <h3 style="margin-bottom:4px; font-size: 15px; font-weight: 700; color: var(--text); flex: 1; word-break: break-word; line-height: 1.3;" title="${g.name}">${g.name}</h3>
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
                                ${g.description ? `<p style="font-size:12px; color: var(--text-muted); font-style: italic; margin-bottom: 8px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px;" title="${g.description}"><span>📝</span> <span style="overflow: hidden; text-overflow: ellipsis;">${g.description}</span></p>` : ''}
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
                                ${g.category ? `
                                <span class="pill-badge" style="color: #ec4899; background: rgba(236, 72, 153, 0.1); border-color: rgba(236, 72, 153, 0.15); padding: 3px 6px; font-size: 10px; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                                    ${g.category}
                                </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;

                el.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-delete-gondola') || e.target.closest('.btn-edit-gondola-name')) return;
                    state.loadGondola(g.id);
                    localStorage.setItem('planogram_store_id', storeId);
                    localStorage.setItem('planogram_gondola_id', g.id);
                    window.location.href = 'editor.html';
                });

                el.querySelector('.btn-edit-gondola-name').addEventListener('click', (e) => {
                    e.stopPropagation();
                    editGondolaModal.dataset.gondolaId = g.id;
                    document.getElementById('edit-gondola-name').value = g.name;
                    document.getElementById('edit-gondola-aisle').value = g.aisle || '';
                    const categorySelect = document.getElementById('edit-gondola-category');
                    if (categorySelect) {
                        categorySelect.value = g.category || '';
                    }
                    const descSelect = document.getElementById('edit-gondola-description');
                    if (descSelect) {
                        descSelect.value = g.description || '';
                    }
                    editGondolaModal.style.display = 'flex';
                    document.getElementById('edit-gondola-name').focus();
                });

                el.querySelector('.btn-delete-gondola').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const deleteModal = document.getElementById('delete-gondola-confirm-modal');
                    if (deleteModal) {
                        const nameSpan = document.getElementById('delete-modal-gondola-name');
                        if (nameSpan) nameSpan.innerText = g.name;
                        deleteModal.dataset.gondolaId = g.id;
                        deleteModal.style.display = 'flex';
                    } else {
                        if (confirm(`¿Seguro que deseas eliminar la góndola "${g.name}"?`)) {
                            state.deleteGondola(g.id);
                            renderStoreDetails();
                        }
                    }
                });

                gondolaList.appendChild(el);
            });
        });
    }

    // --- Consolidated Store Report ---
    function generateStoreDetailsGlobalReport(storeData) {
        try {
            if (!storeData.library || storeData.library.length === 0) {
                detailsReportContent.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No hay góndolas en esta tienda para reportar.</p>';
                detailsReportSection.style.display = 'block';
                detailsReportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }

            let grandTotalUnits = 0;
            let grandTotalValue = 0;
            let grandUniqueSkus = new Set();
            const productStoreMap = {}; // SKU -> { sku, name, category, totalUnits, price, totalValue }

            let html = '';

            storeData.library.forEach(g => {
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
                            
                            const currentShelfDepth = s.depth !== undefined ? s.depth : g.config.shelfDepth;
                            const unitsInZ = Math.floor(currentShelfDepth / dims.depth);
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

            detailsReportContent.innerHTML = summaryCardsHtml + html + consolidatedTableHtml;
            detailsReportSection.style.display = 'block';
            setTimeout(() => detailsReportSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

            // Bind downloads
            const downloadBtn = document.getElementById('btn-details-download-pdf');
            if (downloadBtn) {
                downloadBtn.onclick = () => {
                    try {
                        downloadStoreDetailsPDF(storeData);
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
                        downloadStoreExcel(storeData, `Reporte_Consolidado_${storeData.name.replace(/\s+/g, '_')}`);
                    } catch (err) {
                        console.error("Excel generation error:", err);
                        alert("Error generando el archivo Excel. Revisa la consola.");
                    }
                };
            }
        } catch (error) {
            console.error("Error generating store details global report:", error);
            detailsReportContent.innerHTML = `<p style="color:#ef4444; text-align:center; padding:20px; font-weight:600;">Ocurrió un error al generar el reporte global: ${error.message}.</p>`;
            detailsReportSection.style.display = 'block';
            detailsReportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // --- PDF consolidated report helper functions ---
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

    function generateGondola2DImage(gondolaOverride) {
        const originalGondola = state.gondola;
        let tempGondola = gondolaOverride.config || gondolaOverride;
        let tempName = gondolaOverride.name || 'Góndola';
        
        state.gondola = tempGondola;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const g = state.gondola;
        
        const canvasW = 800;
        const gondolaX = 50; 
        const gondolaY = 60; 
        const availableW = canvasW - gondolaX - 40; 
        const scale = availableW / g.width; 
        const gondolaH = g.height * scale;
        const canvasH = gondolaY + gondolaH + 60; 
        
        canvas.width = canvasW;
        canvas.height = canvasH;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);
        
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 14px "Outfit", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`VISTA FRONTAL TÉCNICA: ${tempName.toUpperCase()}`, gondolaX, 15);
        
        ctx.fillStyle = '#64748b';
        ctx.font = 'normal 9px Inter, sans-serif';
        ctx.fillText(`Tipo: ${(g.type || 'Pared').toUpperCase()} | Profundidad: ${g.shelfDepth || 0}cm`, gondolaX, 32);

        // Draw posts
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

        // Backboard
        const typeColors = {
            pared: '#f8fafc',
            central: '#ffffff',
            cabecera: '#fdfdfd',
            refrigerado: '#f0f9ff'
        };
        ctx.fillStyle = typeColors[g.type] || '#f8fafc';
        ctx.fillRect(gondolaX, gondolaY, availableW, gondolaH);
        
        if (g.type === 'refrigerado') {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
            ctx.fillRect(gondolaX, gondolaY, availableW, gondolaH);
        }

        g.shelves.forEach((s, sIdx) => {
            if (s.type === 'perchero') {
                const usableH = state.getShelfUsableHeight(sIdx);
                const sYCanvas = gondolaY + gondolaH - (s.y * scale);
                const pegboardH = usableH * scale;
                const pegboardY = sYCanvas - pegboardH;
                
                ctx.fillStyle = '#f1f5f9';
                ctx.fillRect(gondolaX, pegboardY, availableW, pegboardH);
                
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
        
        // Placed products
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
                    
                    const baseOffset = isPerchero ? (dims.height * 0.15) * scale : shelfThicknessPx;
                    const pYPx = sYCanvas - baseOffset - (currentY * scale) - pHeightPx;
                    
                    const singleWidthPx = dims.width * scale;
                    for (let f = 0; f < layer.facings; f++) {
                        const faceXPx = pXPx + f * singleWidthPx;
                        
                        const grad = ctx.createLinearGradient(faceXPx, pYPx, faceXPx, pYPx + pHeightPx);
                        const baseCol = product.color || '#3b82f6';
                        grad.addColorStop(0, adjustColor(baseCol, 40));
                        grad.addColorStop(0.25, baseCol);
                        grad.addColorStop(0.85, adjustColor(baseCol, -15));
                        grad.addColorStop(1, adjustColor(baseCol, -30));
                        
                        ctx.fillStyle = grad;
                        ctx.fillRect(faceXPx, pYPx, singleWidthPx, pHeightPx);
                        
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(faceXPx, pYPx, singleWidthPx, pHeightPx);
                        
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(faceXPx + 1, pYPx + 1, singleWidthPx - 2, pHeightPx - 2);
                        
                        if (singleWidthPx > 8 && pHeightPx > 20) {
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                            ctx.fillRect(faceXPx + 2, pYPx, singleWidthPx - 4, 3);
                        }
                    }
                    
                    if (pWidthPx > 22 && pHeightPx > 10) {
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 8px "Outfit", sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
                        ctx.lineWidth = 3;
                        ctx.strokeText(product.sku, pXPx + pWidthPx / 2, pYPx + pHeightPx / 2);
                        ctx.fillText(product.sku, pXPx + pWidthPx / 2, pYPx + pHeightPx / 2);
                    }
                    
                    currentY += dims.height;
                });
            });
        });
        
        // Shelves
        g.shelves.forEach((s, sIdx) => {
            const isPerchero = s.type === 'perchero';
            const sYCanvas = gondolaY + gondolaH - (s.y * scale);
            const shelfThicknessPx = (isPerchero ? 1 : g.shelfThickness) * scale;
            if (isPerchero) {
                ctx.fillStyle = '#475569';
                ctx.fillRect(gondolaX, sYCanvas - shelfThicknessPx, availableW, shelfThicknessPx);

                const spacing = s.hookSpacing || 15;
                const numHooks = Math.floor(g.width / spacing);
                const margin = (g.width - (numHooks - 1) * spacing) / 2;
                
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 2;
                for (let i = 0; i < numHooks; i++) {
                    const hX = gondolaX + (margin + i * spacing) * scale;
                    ctx.beginPath();
                    ctx.arc(hX, sYCanvas, 1.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#cbd5e1';
                    ctx.fill();
                    ctx.stroke();
                }
            } else {
                const shelfGrad = ctx.createLinearGradient(0, sYCanvas - shelfThicknessPx, 0, sYCanvas);
                shelfGrad.addColorStop(0, '#e2e8f0');
                shelfGrad.addColorStop(0.3, '#94a3b8');
                shelfGrad.addColorStop(0.7, '#475569');
                shelfGrad.addColorStop(1, '#334155');
                
                ctx.fillStyle = shelfGrad;
                ctx.fillRect(gondolaX, sYCanvas - shelfThicknessPx, availableW, shelfThicknessPx);
                
                ctx.fillStyle = '#009639'; 
                ctx.fillRect(gondolaX, sYCanvas - Math.max(3, shelfThicknessPx * 0.4), availableW, Math.max(2, shelfThicknessPx * 0.35));
                
                ctx.fillStyle = '#64748b';
                ctx.fillRect(gondolaX - 2, sYCanvas - shelfThicknessPx, 2, shelfThicknessPx + 2);
                ctx.fillRect(gondolaX + availableW, sYCanvas - shelfThicknessPx, 2, shelfThicknessPx + 2);
            }
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(isPerchero ? `PERCHERO N${sIdx+1}` : `PLANCHA N${sIdx+1}`, gondolaX + 8, sYCanvas - shelfThicknessPx/2);
        });

        // Dimensions
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#475569';
        
        const dimY = canvasH - 30;
        ctx.beginPath();
        ctx.moveTo(gondolaX, dimY);
        ctx.lineTo(gondolaX + availableW, dimY);
        ctx.moveTo(gondolaX, dimY - 10);
        ctx.lineTo(gondolaX, dimY + 5);
        ctx.moveTo(gondolaX + availableW, dimY - 10);
        ctx.lineTo(gondolaX + availableW, dimY + 5);
        ctx.stroke();
        
        drawArrow(ctx, gondolaX, dimY, 5, 'left');
        drawArrow(ctx, gondolaX + availableW, dimY, 5, 'right');
        
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

        const dimX = 20;
        ctx.beginPath();
        ctx.moveTo(dimX, gondolaY);
        ctx.lineTo(dimX, gondolaY + gondolaH);
        ctx.moveTo(dimX - 5, gondolaY);
        ctx.lineTo(dimX + 10, gondolaY);
        ctx.moveTo(dimX - 5, gondolaY + gondolaH);
        ctx.lineTo(dimX + 10, gondolaY + gondolaH);
        ctx.stroke();
        
        drawArrow(ctx, dimX, gondolaY, 5, 'up');
        drawArrow(ctx, dimX, gondolaY + gondolaH, 5, 'down');
        
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

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, canvasW, canvasH);
        
        state.gondola = originalGondola;
        return canvas.toDataURL('image/jpeg', 0.95);
    }

    function downloadStoreDetailsPDF(storeData) {
        if (typeof window.jspdf === 'undefined') {
            alert('Falta la librería jsPDF en la página.');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');
        
        let isFirstPage = true;
        let grandTotalUnits = 0;
        let grandTotalValue = 0;
        let grandUniqueSkus = new Set();
        const productStoreMap = {}; 

        storeData.library.forEach((g, gIdx) => {
            if (!isFirstPage) {
                doc.addPage('a4', 'p');
            }
            isFirstPage = false;

            doc.setFillColor(0, 150, 57);
            doc.rect(0, 0, 595, 15, 'F');

            doc.setFontSize(18);
            doc.setTextColor(0, 150, 57);
            doc.setFont('helvetica', 'bold');
            doc.text('REPORTE TÉCNICO DE PLANOGRAMA', 40, 45);

            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            
            let subtitle = `Tienda: ${storeData.name.toUpperCase()} | Góndola ${gIdx + 1}: ${g.name.toUpperCase()} (${(g.config.type || 'pared').toUpperCase()})`;
            if (g.category) subtitle += ` | Cat: ${g.category}`;
            if (g.aisle) subtitle += ` | Pasillo: ${g.aisle}`;
            doc.text(subtitle, 40, 60);
            
            let extraInfo = `Dimensiones: ${g.config.width}x${g.config.height}x${g.config.depth} cm | Fecha: ${new Date().toLocaleString()}`;
            if (g.description) extraInfo += ` | Info: ${g.description}`;
            doc.text(extraInfo, 40, 72);

            try {
                const planogramImgData = generateGondola2DImage(g);
                const scaleCanvas = 710 / g.config.width;
                const canvasH = 120 + g.config.height * scaleCanvas;

                const displayW = 515; 
                let imgW = displayW;
                let imgH = (canvasH / 800) * imgW;
                
                const maxImageH = 665;
                if (imgH > maxImageH) {
                    imgH = maxImageH;
                    imgW = (800 / canvasH) * imgH;
                }
                const imgX = 40 + (displayW - imgW) / 2; 
                const imgY = 85 + (665 - imgH) / 2; 
                doc.addImage(planogramImgData, 'JPEG', imgX, imgY, imgW, imgH);
            } catch (err) {
                console.error("Error generating gondola 2D image in PDF:", err);
                doc.setTextColor(239, 68, 68);
                doc.text("[Error cargando gráfico técnico frontal]", 40, 150);
            }

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
                        const currentShelfDepth = s.depth !== undefined ? s.depth : g.config.shelfDepth;
                        const unitsInZ = Math.floor(currentShelfDepth / dims.depth);
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

                    tableBody.push([
                        `Subtotal ${levelName}`,
                        '', '',
                        `${shelfTotalUnits} U.`,
                        '-',
                        `$${shelfTotalValue.toFixed(2)}`
                    ]);
                }
            });

            tableBody.push([
                `TOTAL GÓNDOLA: ${g.name.toUpperCase()}`,
                '', '',
                `${gondolaTotalUnits} U.`,
                '-',
                `$${gondolaTotalValue.toFixed(2)}`
            ]);

            doc.addPage('a4', 'p');

            doc.setFillColor(0, 150, 57);
            doc.rect(0, 0, 595, 15, 'F');

            doc.setFontSize(16);
            doc.setTextColor(0, 150, 57);
            doc.setFont('helvetica', 'bold');
            doc.text('DETALLE DE INVENTARIO Y CAPACIDAD', 40, 45);

            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            
            let subtitleTable = `Tienda: ${storeData.name.toUpperCase()} | Góndola ${gIdx + 1}: ${g.name.toUpperCase()} (${(g.config.type || 'pared').toUpperCase()})`;
            if (g.category) subtitleTable += ` | Cat: ${g.category}`;
            if (g.aisle) subtitleTable += ` | Pasillo: ${g.aisle}`;
            if (g.description) subtitleTable += ` | Info: ${g.description}`;
            doc.text(subtitleTable, 40, 60);

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

        doc.addPage();
        
        doc.setFillColor(0, 150, 57);
        doc.rect(0, 0, 595, 15, 'F');

        doc.setFontSize(22);
        doc.setTextColor(0, 150, 57);
        doc.setFont('helvetica', 'bold');
        doc.text('CONSOLIDADO GENERAL DE TIENDA', 40, 48);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tienda: ${storeData.name.toUpperCase()} | Total Góndolas Planificadas: ${storeData.library.length}`, 40, 64);
        doc.text(`Generado por: Planogram Pro Retail Analytics Suite | Fecha: ${new Date().toLocaleString()}`, 40, 76);

        // Stats Boxes
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

        doc.setFillColor(243, 244, 246);
        doc.rect(217, 95, 160, 60, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('CAPACIDAD DE STOCK TOTAL', 227, 112);
        doc.setFontSize(16);
        doc.setTextColor(255, 184, 28); 
        doc.setFont('helvetica', 'bold');
        doc.text(`${grandTotalUnits} Unidades`, 227, 138);

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
            headStyles: { fillColor: [31, 41, 55], fontSize: 9 }, 
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

        doc.save(`Reporte_Consolidado_Tienda_${storeData.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    }

    function buildStoreProductSummary(storeData) {
        const summary = {};
        let grandTotalUnits = 0;
        let grandTotalValue = 0;
        const uniqueSkus = new Set();

        storeData.library.forEach(gondola => {
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
                        const currentShelfDepth = shelf.depth !== undefined ? shelf.depth : gondola.config.shelfDepth;
                        const unitsInZ = Math.floor(currentShelfDepth / dims.depth);
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

    function downloadStoreExcel(storeData, filename) {
        const summary = buildStoreProductSummary(storeData);
        if (summary.rows.length === 0) {
            alert('No hay productos en la tienda para exportar.');
            return;
        }
        downloadExcelWorkbook('Tienda', summary.rows, filename, storeData.name || '');
    }

    function downloadExcelWorkbook(sheetName, rows, filename, metadata = '') {
        if (typeof window.XLSX === 'undefined') {
            alert('Falta la librería XLSX en la página.');
            return;
        }
        const header = ['SKU', 'Nombre', 'Categoría', 'Cantidad', 'Precio Unitario', 'Valor Total'];
        
        let aoa = [];
        if (typeof metadata === 'object' && metadata !== null) {
            aoa = [
                ['REPORTE DE PLANOGRAMA'],
                [`Tienda: ${metadata.storeName || ''}`],
                [`Góndola: ${metadata.gondolaName || ''} (${(metadata.type || 'Pared').toUpperCase()})`],
                [`Dimensiones: ${metadata.dimensions || ''}`],
                [`Categoría: ${metadata.category || 'N/A'}  |  Pasillo: ${metadata.aisle || 'N/A'}`],
                [`Información Adicional: ${metadata.description || 'N/A'}`],
                [`Fecha de Generación: ${metadata.date || ''}`],
                [],
                header
            ];
        } else {
            aoa = [
                ['REPORTE CONSOLIDADO DE TIENDA'],
                [`Tienda: ${metadata || ''}`],
                [`Fecha de Generación: ${new Date().toLocaleString()}`],
                [],
                header
            ];
        }
        
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

    // --- Init ---
    renderStoreDetails();

    // Check if we need to auto-trigger the consolidated report
    if (localStorage.getItem('planogram_trigger_report') === 'true') {
        localStorage.removeItem('planogram_trigger_report');
        const freshStore = state.stores.find(s => s.id === storeId);
        generateStoreDetailsGlobalReport(freshStore || store);
    }
});
