document.addEventListener('DOMContentLoaded', () => {
    const authKey = 'planogram_logged_in';
    
    // Always require a fresh session for direct access to this page.
    if (localStorage.getItem(authKey) !== 'true' || sessionStorage.getItem('planogram_session_active') !== 'true') {
        localStorage.removeItem(authKey);
        window.location.href = 'login.html';
        return;
    }

    const state = new AppState();
    const storeList = document.getElementById('store-list');
    
    // --- Modals ---
    const createStoreForm = document.getElementById('create-store-form');
    const editStoreForm = document.getElementById('edit-store-form');
    const deleteStoreConfirmModal = document.getElementById('delete-store-confirm-modal');

    // Show Create Store Modal
    document.getElementById('btn-show-create-store').addEventListener('click', () => {
        document.getElementById('new-store-name').value = '';
        document.getElementById('new-store-custom-id').value = '';
        createStoreForm.style.display = 'flex';
        document.getElementById('new-store-name').focus();
    });

    // Close Create Store Modal
    document.getElementById('btn-close-store-modal-x').addEventListener('click', () => {
        createStoreForm.style.display = 'none';
    });
    document.getElementById('btn-cancel-create-store').addEventListener('click', () => {
        createStoreForm.style.display = 'none';
    });

    // Confirm Create Store
    document.getElementById('btn-create-store').addEventListener('click', () => {
        const name = document.getElementById('new-store-name').value.trim();
        const customId = document.getElementById('new-store-custom-id').value.trim();
        if (name) {
            state.createStore(name, customId);
            createStoreForm.style.display = 'none';
            renderStoreList();
        } else {
            alert('El nombre es requerido.');
        }
    });

    // Close Edit Store Modal
    document.getElementById('btn-close-edit-store-modal-x').addEventListener('click', () => {
        editStoreForm.style.display = 'none';
    });
    document.getElementById('btn-cancel-edit-store').addEventListener('click', () => {
        editStoreForm.style.display = 'none';
    });

    // Confirm Edit Store
    document.getElementById('btn-save-store').addEventListener('click', () => {
        const id = editStoreForm.dataset.storeId;
        const name = document.getElementById('edit-store-name').value.trim();
        const customId = document.getElementById('edit-store-custom-id').value.trim();
        if (name && customId) {
            const newId = 'store-' + customId;
            const result = state.updateStoreDetails(id, name, newId);
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

    // Close Delete Store Modal
    document.getElementById('btn-close-delete-modal-x').addEventListener('click', () => {
        deleteStoreConfirmModal.style.display = 'none';
    });
    document.getElementById('btn-cancel-delete-modal').addEventListener('click', () => {
        deleteStoreConfirmModal.style.display = 'none';
    });

    // Confirm Delete Store
    document.getElementById('btn-confirm-delete-store').addEventListener('click', () => {
        const storeId = deleteStoreConfirmModal.dataset.storeId;
        if (storeId) {
            state.deleteStore(storeId);
            deleteStoreConfirmModal.style.display = 'none';
            renderStoreList();
        }
    });

    // Click outside modals to close
    [createStoreForm, editStoreForm, deleteStoreConfirmModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    });

    // Logout
    document.getElementById('btn-logout-main').addEventListener('click', () => {
        localStorage.removeItem(authKey);
        sessionStorage.removeItem('planogram_session_active');
        window.location.href = 'login.html';
    });

    // --- Render Stores ---
    function renderStoreList() {
        if (!storeList) return;
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
                                            const shelfDepth = shelf.depth !== undefined ? shelf.depth : g.config.shelfDepth;
                                            storeTotalUnits += (layer.facings || 1) * Math.floor(shelfDepth / dims.depth);
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
                                <h3 style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0;">${s.name}</h3>
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
                localStorage.setItem('planogram_store_id', s.id);
                window.location.href = 'store-details.html';
            });

            el.querySelector('.btn-store-report').addEventListener('click', (e) => {
                e.stopPropagation();
                state.selectStore(s.id);
                localStorage.setItem('planogram_store_id', s.id);
                localStorage.setItem('planogram_trigger_report', 'true');
                window.location.href = 'store-details.html';
            });

            el.querySelector('.btn-edit-store').addEventListener('click', (e) => {
                e.stopPropagation();
                const nameInput = document.getElementById('edit-store-name');
                const idInput = document.getElementById('edit-store-custom-id');
                nameInput.value = s.name;
                idInput.value = s.id.replace('store-', '');
                editStoreForm.dataset.storeId = s.id;
                editStoreForm.style.display = 'flex';
                nameInput.focus();
            });

            el.querySelector('.btn-delete-store-icon').addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('delete-modal-store-name').innerText = s.name;
                deleteStoreConfirmModal.dataset.storeId = s.id;
                deleteStoreConfirmModal.style.display = 'flex';
            });

            storeList.appendChild(el);
        });
    }

    // Run initial render
    renderStoreList();
});
