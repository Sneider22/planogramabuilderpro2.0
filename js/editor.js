/* ============================================
   EDITOR.JS - Simulador 3D de Planogramas
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // --- Session Check ---
    const authKey = 'planogram_logged_in';
    if (localStorage.getItem(authKey) !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    const state = new AppState();
    const calculator = new SpaceCalculator(state);

    // --- Load Store & Gondola ---
    const storeId = localStorage.getItem('planogram_store_id');
    const gondolaId = localStorage.getItem('planogram_gondola_id');

    if (!storeId) {
        window.location.href = 'stores.html';
        return;
    }

    state.selectStore(storeId);

    if (!gondolaId || !state.library.some(p => p.id === gondolaId)) {
        window.location.href = 'store-details.html';
        return;
    }

    state.loadGondola(gondolaId);

    // --- DOM References ---
    const viewport = document.querySelector('.viewport');
    const gondola3d = document.getElementById('gondola-3d');
    const catalogList = document.getElementById('catalog-list');
    const catalogSearch = document.getElementById('catalog-search');

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

    const activeStore = state.stores.find(s => s.id === storeId);
    const headerStoreName = document.getElementById('header-store-name');
    if (headerStoreName && activeStore) {
        const activePreset = state.library.find(p => p.id === gondolaId);
        let headerText = activeStore.name;
        if (activePreset) {
            headerText += ` › ${activePreset.name}`;
            if (activePreset.aisle) {
                headerText += ` (${activePreset.aisle})`;
            }
            if (activePreset.description) {
                headerText += ` · 📝 ${activePreset.description}`;
            }
        }
        headerStoreName.innerText = headerText;
    }

    // --- Navigation ---
    document.getElementById('btn-back-stores').addEventListener('click', () => {
        window.location.href = 'store-details.html';
    });

    document.getElementById('btn-logout-app').addEventListener('click', () => {
        localStorage.removeItem(authKey);
        window.location.href = 'login.html';
    });

    // --- Empty Gondola Confirm Modal ---
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

    // --- Can Drop Check ---
    const canDropProduct = (shelfIndex, productId, targetGondola = state.gondola) => {
        if (!productId) return false;
        const product = state.getProductById(productId);
        if (!product) return false;
        const shelf = targetGondola.shelves[shelfIndex];
        if (!shelf) return false;

        const getShelfUsableHeightLocal = (sIdx) => {
            const shelfObj = targetGondola.shelves[sIdx];
            if (!shelfObj) return 0;
            const nextShelf = targetGondola.shelves[sIdx + 1];
            const ceiling = nextShelf ? nextShelf.y : targetGondola.height;
            return ceiling - (shelfObj.y + targetGondola.shelfThickness);
        };

        const usableHeight = getShelfUsableHeightLocal(shelfIndex);
        if (product.height > usableHeight) return false;

        if (shelf.type === 'perchero') {
            const spacing = shelf.hookSpacing || 15;
            const numHooks = Math.floor(targetGondola.width / spacing);
            const margin = (targetGondola.width - (numHooks - 1) * spacing) / 2;
            const occupiedHooks = new Set();
            shelf.products.forEach(p => {
                if (p.layers && p.layers.length > 0) {
                    const dims = state.getPlacedDimensions(p.layers[0].productId, p.layers[0].orientation || 0);
                    const neededHooks = Math.ceil((dims.width * p.layers[0].facings) / spacing);
                    const hookIdx = Math.round((p.x - margin) / spacing);
                    for (let h = hookIdx; h < hookIdx + neededHooks; h++) occupiedHooks.add(h);
                }
            });
            return occupiedHooks.size < numHooks;
        }

        const usedWidth = shelf.products.reduce((acc, p) => {
            if (p.layers && p.layers.length > 0) {
                const d = state.getPlacedDimensions(p.layers[0].productId, p.layers[0].orientation || 0);
                return acc + d.width * p.layers[0].facings;
            }
            return acc;
        }, 0);
        return (usedWidth + product.width) <= targetGondola.width;
    };

    // --- Dashboard Stats ---
    function updateDashboard() {
        const globalStats = calculator.getGlobalStats();
        if (stats.value) stats.value.innerText = `$${globalStats.totalValue.toFixed(2)}`;
        if (stats.units) stats.units.innerText = globalStats.totalUnits.toString();
        if (stats.skus) stats.skus.innerText = globalStats.totalSKUs.toString();
    }

    // --- Init App Content ---
    function initAppContent() {
        Object.keys(inputs).forEach(key => {
            if (key === 'gap' && inputs[key]) inputs[key].value = state.gondola.gapBetweenShelves;
            else if (key === 'autoPack' && inputs[key]) inputs[key].checked = state.gondola.autoPack;
            else if (inputs[key]) inputs[key].value = state.gondola[key];
        });

        renderGondola();
        renderCatalog();
        updateDashboard();
    }

    // =============================================
    // === RENDER GONDOLA 3D ===
    // =============================================
    function renderGondola() {
        const scale = 3;

        // Sync Undo/Redo Buttons State
        const btnUndo = document.getElementById('btn-undo');
        const btnRedo = document.getElementById('btn-redo');
        if (btnUndo) {
            const hasUndo = state.undoStack && state.undoStack.length > 0;
            btnUndo.disabled = !hasUndo;
            btnUndo.style.opacity = hasUndo ? '1' : '0.4';
            btnUndo.style.cursor = hasUndo ? 'pointer' : 'not-allowed';
        }
        if (btnRedo) {
            const hasRedo = state.redoStack && state.redoStack.length > 0;
            btnRedo.disabled = !hasRedo;
            btnRedo.style.opacity = hasRedo ? '1' : '0.4';
            btnRedo.style.cursor = hasRedo ? 'pointer' : 'not-allowed';
        }

        const showDragCaret = (shelfEl, shelf, dragXcm, targetWidth) => {
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

        // Clear and configure the 3D gondola viewport as a flex row representing the whole aisle
        gondola3d.style.width = 'auto';
        gondola3d.style.height = 'auto';
        gondola3d.innerHTML = '';

        // Find matching gondolas belonging to the same category
        const activeGondolaId = state.currentGondolaId;
        const activeGondolaObj = state.library.find(p => p.id === activeGondolaId);
        const currentCategory = activeGondolaObj ? activeGondolaObj.category : '';
        
        let matchingGondolas = [];
        if (currentCategory) {
            matchingGondolas = state.library.filter(p => p.category === currentCategory);
        } else {
            matchingGondolas = [activeGondolaObj].filter(Boolean);
        }

        if (matchingGondolas.length === 0 && activeGondolaObj) {
            matchingGondolas = [activeGondolaObj];
        }

        // Sort alphabetically to maintain aisle layout order
        matchingGondolas.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'}));

        // Render each matching gondola side-by-side
        matchingGondolas.forEach((gObj) => {
            const isGondolaActive = (gObj.id === activeGondolaId);
            const g = gObj.config;

            const gWrapper = document.createElement('div');
            gWrapper.className = 'single-gondola-3d' + (isGondolaActive ? ' active-gondola' : '');
            gWrapper.dataset.gondolaId = gObj.id;
            gWrapper.style.position = 'relative';
            gWrapper.style.width = `${g.width * scale}px`;
            gWrapper.style.height = `${g.height * scale}px`;
            gWrapper.style.transformStyle = 'preserve-3d';
            gWrapper.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease, opacity 0.3s ease';
            gWrapper.style.borderRadius = '8px';

            if (isGondolaActive) {
                gWrapper.style.boxShadow = '0 0 0 3px var(--primary), 0 20px 40px rgba(0, 150, 57, 0.15)';
                gWrapper.style.opacity = '1';
            } else {
                gWrapper.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)';
                gWrapper.style.opacity = '0.75';
            }

            // Click to activate this gondola
            gWrapper.addEventListener('click', (e) => {
                if (e.target.closest('.placed-product') || e.target.closest('button')) return;
                if (state.currentGondolaId !== gObj.id) {
                    state.loadGondola(gObj.id);
                }
            });

            // Floating Header Badge Above Gondola
            const gHeader = document.createElement('div');
            gHeader.style.cssText = `
                position: absolute;
                top: -55px;
                left: 0;
                right: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                pointer-events: auto;
                cursor: pointer;
                z-index: 10000;
                transform: translateZ(20px);
            `;
            
            const nameBadge = document.createElement('div');
            nameBadge.style.cssText = `
                background: ${isGondolaActive ? 'var(--primary)' : 'rgba(30, 41, 59, 0.85)'};
                color: white;
                padding: 6px 12px;
                border-radius: 8px;
                font-size: 11px;
                font-weight: 700;
                border: 1px solid ${isGondolaActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'};
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s ease;
            `;
            
            if (isGondolaActive) {
                nameBadge.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle;">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                    <span>${gObj.name} (Activa)</span>
                `;
            } else {
                nameBadge.innerHTML = `<span>${gObj.name}</span>`;
            }
            
            const categoryBadge = document.createElement('div');
            categoryBadge.style.cssText = `
                background: rgba(0, 0, 0, 0.5);
                color: rgba(255,255,255,0.6);
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 9px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            `;
            categoryBadge.innerText = gObj.category || 'Sin Categoría';
            
            gHeader.appendChild(nameBadge);
            gHeader.appendChild(categoryBadge);
            gWrapper.appendChild(gHeader);

            // === Type-specific visual structures ===
            const typeColors = {
                pared: { back: '#1e293b', shelf: '#475569', shelfTop: '#64748b', shelfFront: '#334155', border: '#334155', accent: 'rgba(255,255,255,0.03)' },
                central: { back: 'transparent', shelf: '#78716c', shelfTop: '#a8a29e', shelfFront: '#57534e', border: '#44403c', accent: 'rgba(168,162,158,0.08)' },
                cabecera: { back: '#1c1917', shelf: '#44403c', shelfTop: '#57534e', shelfFront: '#292524', border: '#57534e', accent: 'rgba(251,146,60,0.05)' },
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
                const colL = document.createElement('div');
                colL.style.cssText = `position:absolute; left:-6px; top:0; width:6px; height:100%; background:#334155; transform-style:preserve-3d;`;
                const colLSide = document.createElement('div');
                colLSide.style.cssText = `position:absolute; left:0; width:${g.depth * scale}px; height:100%; background:#2d3a4a; transform:rotateY(-90deg); transform-origin:left;`;
                colL.appendChild(colLSide);
                gWrapper.appendChild(colL);

                const colR = document.createElement('div');
                colR.style.cssText = `position:absolute; right:-6px; top:0; width:6px; height:100%; background:#334155; transform-style:preserve-3d;`;
                const colRSide = document.createElement('div');
                colRSide.style.cssText = `position:absolute; right:0; width:${g.depth * scale}px; height:100%; background:#2d3a4a; transform:rotateY(90deg); transform-origin:right;`;
                colR.appendChild(colRSide);
                gWrapper.appendChild(colR);

            } else if (g.type === 'central') {
                backPanel.style.background = 'transparent';
                backPanel.style.borderLeft = `4px solid #78716c`;
                backPanel.style.borderRight = `4px solid #78716c`;
                ['left:-8px', 'right:-8px'].forEach(pos => {
                    const post = document.createElement('div');
                    post.style.cssText = `position:absolute; ${pos}; top:0; width:8px; height:100%; background:linear-gradient(180deg, #a8a29e, #78716c); border-radius:2px; transform-style:preserve-3d;`;
                    const postDepth = document.createElement('div');
                    const isLeft = pos.startsWith('left');
                    postDepth.style.cssText = `position:absolute; ${isLeft ? 'left:0' : 'right:0'}; width:${g.depth * scale}px; height:100%; background:#57534e; transform:rotateY(${isLeft ? '-' : ''}90deg); transform-origin:${isLeft ? 'left' : 'right'};`;
                    post.appendChild(postDepth);
                    gWrapper.appendChild(post);
                });

            } else if (g.type === 'cabecera') {
                backPanel.style.background = `linear-gradient(180deg, #292524 0%, #1c1917 100%)`;
                backPanel.style.border = `2px solid ${tc.border}`;
                backPanel.style.borderRadius = '4px';
                const accent = document.createElement('div');
                accent.style.cssText = `position:absolute; top:0; left:0; right:0; height:4px; background:linear-gradient(90deg, #f97316, #fb923c, #f97316); border-radius:2px 2px 0 0;`;
                backPanel.appendChild(accent);

            } else if (g.type === 'refrigerado') {
                backPanel.style.background = `linear-gradient(180deg, #0c1929 0%, #0a1628 100%)`;
                backPanel.style.border = `3px solid ${tc.border}`;
                backPanel.style.borderRadius = '6px';
                backPanel.style.boxShadow = `inset 0 0 80px rgba(59,130,246,0.08), 0 0 30px rgba(59,130,246,0.1)`;
                const glow = document.createElement('div');
                glow.style.cssText = `position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent);`;
                backPanel.appendChild(glow);
                const glass = document.createElement('div');
                glass.style.cssText = `position:absolute; top:0; right:0; width:${g.depth * scale}px; height:100%; background:rgba(59,130,246,0.04); border:1px solid rgba(59,130,246,0.15); transform:rotateY(90deg); transform-origin:right; backdrop-filter:blur(2px);`;
                backPanel.appendChild(glass);
            }

            gWrapper.appendChild(backPanel);

            g.shelves.forEach((shelf, idx) => {
                const isPerchero = shelf.type === 'perchero';

                // Pegboard panel for perchero
                if (isPerchero) {
                    const getShelfUsableHeightLocal = (sIdx) => {
                        const shelfObj = g.shelves[sIdx];
                        if (!shelfObj) return 0;
                        const nextShelf = g.shelves[sIdx + 1];
                        const ceiling = nextShelf ? nextShelf.y : g.height;
                        return ceiling - (shelfObj.y + g.shelfThickness);
                    };
                    const usableH = getShelfUsableHeightLocal(idx);
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

                    pegboard.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        const productId = window.currentlyDraggedProductId;
                        if (productId && !canDropProduct(idx, productId, g)) {
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
                            if (dragData.sourceGondolaId === gObj.id) {
                                const result = state.moveProduct(dragData.sourceShelfIndex, dragData.sourcePlacementIndex, idx, closestHookIdx, dragData.sourceLayerIndex);
                                if (!result.success) {
                                    alert(result.reason);
                                    renderGondola();
                                }
                            } else {
                                // Cross-gondola move
                                const sourceGondolaPreset = state.library.find(p => p.id === dragData.sourceGondolaId);
                                const sourceGondolaConfig = sourceGondolaPreset ? sourceGondolaPreset.config : null;
                                const sourceShelf = sourceGondolaConfig ? sourceGondolaConfig.shelves[dragData.sourceShelfIndex] : null;
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
                                    state.loadGondola(dragData.sourceGondolaId);
                                    state.removeFromShelf(dragData.sourceShelfIndex, dragData.sourcePlacementIndex, dragData.sourceLayerIndex);
                                    state.loadGondola(gObj.id);
                                    const result = state.placeProduct(idx, pId, facings, closestHookIdx);
                                    if (!result.success) {
                                        alert(result.reason);
                                        renderGondola();
                                    }
                                }
                            }
                        } else {
                            const productId = e.dataTransfer.getData('text/plain');
                            if (gObj.id !== state.currentGondolaId) {
                                state.loadGondola(gObj.id);
                            }
                            const result = state.placeProduct(idx, productId, 1, closestHookIdx);
                            if (!result.success) {
                                alert(result.reason);
                                renderGondola();
                            }
                        }
                    });

                    gWrapper.appendChild(pegboard);
                }

                const shelfEl = document.createElement('div');
                const currentShelfDepth = shelf.depth !== undefined ? shelf.depth : g.shelfDepth;
                shelfEl.className = 'shelf-3d';
                shelfEl.style.width = `${g.width * scale}px`;
                shelfEl.style.height = `${(isPerchero ? 1 : g.shelfThickness) * scale}px`;
                shelfEl.style.bottom = `${shelf.y * scale}px`;
                shelfEl.style.left = '0px';
                shelfEl.style.transform = `translateZ(0px)`;

                shelfEl.style.background = isPerchero ? '#475569' : tc.shelf;
                shelfEl.style.borderColor = isPerchero ? '#334155' : `${tc.border}`;

                // Collision checks
                const getShelfUsableHeightLocal = (sIdx) => {
                    const shelfObj = g.shelves[sIdx];
                    if (!shelfObj) return 0;
                    const nextShelf = g.shelves[sIdx + 1];
                    const ceiling = nextShelf ? nextShelf.y : g.height;
                    return ceiling - (shelfObj.y + g.shelfThickness);
                };
                const usableHeight = getShelfUsableHeightLocal(idx);
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

                    const currentShelfDepth = shelf.depth !== undefined ? shelf.depth : g.shelfDepth;
                    if (totalHeight > usableHeight) hasHeightCollision = true;
                    if (maxDepth > currentShelfDepth) hasDepthCollision = true;
                });

                if (hasHeightCollision || hasDepthCollision) {
                    shelfEl.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.7)';
                    shelfEl.style.animation = 'pulseError 1.5s infinite alternate';
                    shelfEl.title = hasHeightCollision
                        ? 'Advertencia: ¡Los productos exceden la altura disponible del estante!'
                        : 'Advertencia: ¡Los productos sobresalen de la profundidad del estante!';
                }

                // Drag and Drop on shelf
                shelfEl.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    shelfEl.classList.add('drag-over');
                    if (!isPerchero && g.autoPack) {
                        const rect = shelfEl.getBoundingClientRect();
                        const dragXpx = e.clientX - rect.left;
                        const dragXcm = (dragXpx / rect.width) * g.width;
                        showDragCaret(shelfEl, shelf, dragXcm, g.width);
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
                            let productWidth = 10;
                            const dragDataStr = e.dataTransfer.getData('application/json');
                            if (dragDataStr) {
                                const dragData = JSON.parse(dragDataStr);
                                const sourceGondolaPreset = state.library.find(p => p.id === dragData.sourceGondolaId);
                                const sourceGondolaConfig = sourceGondolaPreset ? sourceGondolaPreset.config : null;
                                const sourceShelf = sourceGondolaConfig ? sourceGondolaConfig.shelves[dragData.sourceShelfIndex] : null;
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
                                if (product) productWidth = product.width;
                            }
                            targetX = dropXcm - (productWidth / 2);
                        }
                    }

                    const dragDataStr = e.dataTransfer.getData('application/json');
                    if (dragDataStr) {
                        const dragData = JSON.parse(dragDataStr);
                        if (dragData.sourceGondolaId === gObj.id) {
                            const result = state.moveProduct(dragData.sourceShelfIndex, dragData.sourcePlacementIndex, idx, targetHookIndex, dragData.sourceLayerIndex, targetX, insertIndex);
                            if (!result.success) {
                                alert(result.reason);
                                renderGondola();
                            }
                        } else {
                            // Cross-gondola move
                            const sourceGondolaPreset = state.library.find(p => p.id === dragData.sourceGondolaId);
                            const sourceGondolaConfig = sourceGondolaPreset ? sourceGondolaPreset.config : null;
                            const sourceShelf = sourceGondolaConfig ? sourceGondolaConfig.shelves[dragData.sourceShelfIndex] : null;
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
                                state.loadGondola(dragData.sourceGondolaId);
                                state.removeFromShelf(dragData.sourceShelfIndex, dragData.sourcePlacementIndex, dragData.sourceLayerIndex);
                                state.loadGondola(gObj.id);
                                const result = state.placeProduct(idx, pId, facings, targetHookIndex, targetX, insertIndex);
                                if (!result.success) {
                                    alert(result.reason);
                                    renderGondola();
                                }
                            }
                        }
                    } else {
                        const productId = e.dataTransfer.getData('text/plain');
                        if (gObj.id !== state.currentGondolaId) {
                            state.loadGondola(gObj.id);
                        }
                        const result = state.placeProduct(idx, productId, 1, targetHookIndex, targetX, insertIndex);
                        if (!result.success) {
                            alert(result.reason);
                            renderGondola();
                        }
                    }
                });

                const top = document.createElement('div');
                top.className = 'shelf-top';
                top.style.height = `${(isPerchero ? 2 : currentShelfDepth) * scale}px`;
                top.style.background = isPerchero ? '#64748b' : tc.shelfTop;
                shelfEl.appendChild(top);

                const front = document.createElement('div');
                front.className = 'shelf-front';
                front.style.transform = `translateZ(${(isPerchero ? 2 : currentShelfDepth) * scale}px)`;
                front.style.background = isPerchero ? '#334155' : tc.shelfFront;
                shelfEl.appendChild(front);

                // Hook rods for perchero
                if (isPerchero) {
                    const spacing = shelf.hookSpacing || 15;
                    const numHooks = Math.floor(g.width / spacing);
                    const margin = (g.width - (numHooks - 1) * spacing) / 2;

                    for (let i = 0; i < numHooks; i++) {
                        const hookX = margin + i * spacing;

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
                            width: ${currentShelfDepth * scale}px;
                            box-shadow: 0 3px 5px rgba(0,0,0,0.35);
                        `;
                        hook.appendChild(rod);

                        const tip = document.createElement('div');
                        tip.style.cssText = `
                            position: absolute;
                            left: ${currentShelfDepth * scale}px;
                            bottom: 0;
                            width: 4px;
                            height: 8px;
                            background: #e2e8f0;
                            transform: rotateX(-45deg);
                        `;
                        hook.appendChild(tip);

                        gWrapper.appendChild(hook);
                    }
                }

                // Products on shelf
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

                        const unitsInZ = Math.floor(currentShelfDepth / dims.depth);
                        const visualDepth = unitsInZ * dims.depth * scale;

                        const layerEl = document.createElement('div');
                        layerEl.className = 'placed-product';
                        layerEl.draggable = true;
                        layerEl.style.cursor = 'grab';
                        layerEl.style.width = `${dims.width * scale * layer.facings}px`;
                        layerEl.style.height = `${dims.height * scale}px`;
                        layerEl.style.bottom = `${currentY * scale}px`;
                        layerEl.style.left = `0px`;
                        layerEl.style.transform = `translateZ(${currentShelfDepth * scale - visualDepth}px)`;

                        layerEl.addEventListener('dragstart', (e) => {
                            e.stopPropagation();
                            e.dataTransfer.setData('application/json', JSON.stringify({
                                sourceShelfIndex: idx,
                                sourcePlacementIndex: pIdx,
                                sourceLayerIndex: lIdx,
                                sourceGondolaId: gObj.id
                            }));
                            e.dataTransfer.setData('text/plain', layer.productId);
                            window.currentlyDraggedProductId = layer.productId;
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

                        // Hover Card
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
                            if (gObj.id !== state.currentGondolaId) {
                                state.loadGondola(gObj.id);
                            }
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
                            if (gObj.id !== state.currentGondolaId) {
                                state.loadGondola(gObj.id);
                            }
                            const result = state.stackProduct(idx, pIdx, droppedProductId);
                            if (!result.success) alert(result.reason);
                        });

                        layerEl.addEventListener('dblclick', (e) => {
                            e.stopPropagation();
                            if (gObj.id !== state.currentGondolaId) {
                                state.loadGondola(gObj.id);
                            }
                            state.removeFromShelf(idx, pIdx, lIdx);
                        });

                        placementEl.appendChild(layerEl);
                        currentY += dims.height;
                    });

                    shelfEl.appendChild(placementEl);
                });

                gWrapper.appendChild(shelfEl);
            });

            gondola3d.appendChild(gWrapper);
        });

        renderShelfTypesControls();

        // Auto-center the active gondola within the viewport
        setTimeout(() => {
            const activeEl = gondola3d.querySelector('.single-gondola-3d.active-gondola');
            if (activeEl && viewport) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }, 50);
    }

    // =============================================
    // === SHELF TYPE CONTROLS ===
    // =============================================
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
            row.style.cssText = 'display:flex; flex-direction:column; background:#ffffff; padding:12px; border-radius:8px; border:1px solid var(--border); margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); gap: 8px; transition: all 0.2s ease;';

            const controlGroup = document.createElement('div');
            controlGroup.style.cssText = 'display:flex; flex-direction:column; width:100%; gap:8px;';

            const headerLine = document.createElement('div');
            headerLine.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';

            const label = document.createElement('span');
            label.innerText = `Nivel ${shelf.index + 1}`;
            label.style.cssText = 'font-weight:600; font-size:13px; color:var(--text);';

            const select = document.createElement('select');
            select.style.cssText = 'background:var(--input-bg); border:1px solid var(--border); color:var(--text); border-radius:6px; padding:4px 8px; font-size:12px; font-weight:500; cursor:pointer; outline:none; transition: all 0.2s;';
            select.innerHTML = `
                <option value="plancha" ${shelf.type === 'plancha' ? 'selected' : ''}>Plancha</option>
                <option value="perchero" ${shelf.type === 'perchero' ? 'selected' : ''}>Perchero</option>
            `;

            select.addEventListener('focus', () => {
                select.style.borderColor = 'var(--primary)';
                select.style.boxShadow = '0 0 0 2px rgba(0, 150, 57, 0.1)';
            });
            select.addEventListener('blur', () => {
                select.style.borderColor = 'var(--border)';
                select.style.boxShadow = 'none';
            });

            select.addEventListener('change', (e) => {
                state.setShelfType(shelf.index, e.target.value);
            });

            headerLine.appendChild(label);
            headerLine.appendChild(select);
            controlGroup.appendChild(headerLine);

            // CUSTOM GAP FIELD (Distancia al nivel anterior)
            const gapLine = document.createElement('div');
            gapLine.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top:4px; padding-top:6px; border-top:1px solid var(--border);';

            const gapLabel = document.createElement('span');
            gapLabel.style.cssText = 'font-size:11px; color:var(--text-muted); font-weight:500;';
            const prevText = shelf.index === 0 ? 'Distancia a la base (cm):' : `Distancia al Nivel ${shelf.index} (cm):`;
            gapLabel.innerText = prevText;

            const baseHeight = parseFloat(g.baseHeight) || 20;
            const shelfThickness = parseFloat(g.shelfThickness) || 2;
            const prevY = shelf.index === 0 ? baseHeight : parseFloat(g.shelves[shelf.index - 1].y) + shelfThickness;
            const currentGap = Math.max(0, parseFloat(shelf.y) - prevY);

            const gapInput = document.createElement('input');
            gapInput.type = 'number';
            gapInput.min = '0';
            gapInput.step = '1';
            gapInput.value = Math.round(currentGap);
            gapInput.style.cssText = 'width:70px; background:rgba(255,255,255,0.05); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:6px 8px; font-size:13px; font-weight:600; text-align:center; outline:none; transition: all 0.2s ease; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);';

            gapInput.addEventListener('focus', () => {
                gapInput.style.borderColor = 'var(--primary)';
                gapInput.style.backgroundColor = 'rgba(255,255,255,0.08)';
                gapInput.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15), inset 0 1px 2px rgba(0,0,0,0.1)';
            });
            gapInput.addEventListener('blur', () => {
                gapInput.style.borderColor = 'var(--border)';
                gapInput.style.backgroundColor = 'rgba(255,255,255,0.05)';
                gapInput.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.1)';
            });

            gapInput.addEventListener('change', (e) => {
                const newGap = parseFloat(e.target.value);
                if (isNaN(newGap) || newGap < 0) {
                    gapInput.value = Math.round(currentGap);
                    return;
                }
                state.setShelfGap(shelf.index, newGap);
            });

            gapLine.appendChild(gapLabel);
            gapLine.appendChild(gapInput);
            controlGroup.appendChild(gapLine);

            // DEPTH FIELD (Profundidad del nivel)
            const depthLine = document.createElement('div');
            depthLine.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top:4px; padding-top:6px; border-top:1px solid var(--border);';

            const depthLabel = document.createElement('span');
            depthLabel.style.cssText = 'font-size:11px; color:var(--text-muted); font-weight:500;';
            depthLabel.innerText = 'Profundidad (cm):';

            const currentDepth = shelf.depth !== undefined ? shelf.depth : g.shelfDepth;

            const depthInput = document.createElement('input');
            depthInput.type = 'number';
            depthInput.min = '5';
            depthInput.max = '200';
            depthInput.step = '1';
            depthInput.value = Math.round(currentDepth);
            depthInput.style.cssText = 'width:70px; background:rgba(255,255,255,0.05); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:6px 8px; font-size:13px; font-weight:600; text-align:center; outline:none; transition: all 0.2s ease; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);';

            depthInput.addEventListener('focus', () => {
                depthInput.style.borderColor = 'var(--primary)';
                depthInput.style.backgroundColor = 'rgba(255,255,255,0.08)';
                depthInput.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15), inset 0 1px 2px rgba(0,0,0,0.1)';
            });
            depthInput.addEventListener('blur', () => {
                depthInput.style.borderColor = 'var(--border)';
                depthInput.style.backgroundColor = 'rgba(255,255,255,0.05)';
                depthInput.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.1)';
            });

            depthInput.addEventListener('change', (e) => {
                const newDepth = parseFloat(e.target.value);
                if (isNaN(newDepth) || newDepth < 5) {
                    depthInput.value = Math.round(currentDepth);
                    return;
                }
                state.setShelfDepth(shelf.index, newDepth);
            });

            depthLine.appendChild(depthLabel);
            depthLine.appendChild(depthInput);
            controlGroup.appendChild(depthLine);

            // HOOK SPACING FIELD (Input number instead of range slider)
            if (shelf.type === 'perchero') {
                const sliderLine = document.createElement('div');
                sliderLine.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top:4px; padding-top:6px; border-top:1px solid var(--border);';

                const sliderLabel = document.createElement('span');
                sliderLabel.style.cssText = 'font-size:11px; color:var(--text-muted); font-weight:500;';
                sliderLabel.innerText = `Separación Ganchos (cm):`;

                const spacingInput = document.createElement('input');
                spacingInput.type = 'number';
                spacingInput.min = '5';
                spacingInput.max = '50';
                spacingInput.value = shelf.hookSpacing || 15;
                spacingInput.style.cssText = 'width:70px; background:rgba(255,255,255,0.05); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:6px 8px; font-size:13px; font-weight:600; text-align:center; outline:none; transition: all 0.2s ease; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);';

                spacingInput.addEventListener('focus', () => {
                    spacingInput.style.borderColor = 'var(--primary)';
                    spacingInput.style.backgroundColor = 'rgba(255,255,255,0.08)';
                    spacingInput.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15), inset 0 1px 2px rgba(0,0,0,0.1)';
                });
                spacingInput.addEventListener('blur', () => {
                    spacingInput.style.borderColor = 'var(--border)';
                    spacingInput.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    spacingInput.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.1)';
                });

                spacingInput.addEventListener('change', (e) => {
                    const proposed = parseFloat(e.target.value);
                    if (isNaN(proposed) || proposed <= 0) {
                        spacingInput.value = shelf.hookSpacing || 15;
                        return;
                    }
                    const check = state.checkHookSpacingOverlap(shelf.index, proposed);
                    if (!check.valid) {
                        alert(`⚠️ Imposible reducir separación:\n\n${check.reason}`);
                        spacingInput.value = shelf.hookSpacing || 15;
                        return;
                    }
                    state.setShelfHookSpacing(shelf.index, proposed);
                });

                sliderLine.appendChild(sliderLabel);
                sliderLine.appendChild(spacingInput);
                controlGroup.appendChild(sliderLine);
            }

            row.appendChild(controlGroup);
            container.appendChild(row);
        });
    }

    // =============================================
    // === RENDER CATALOG ===
    // =============================================
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
            const catWrapper = document.createElement('div');
            catWrapper.style.cssText = 'margin-bottom: 12px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); overflow: hidden;';

            const header = document.createElement('div');
            header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background: rgba(0,0,0,0.2); cursor:pointer; font-size:12px; font-weight:700; color:var(--text); text-transform:uppercase; user-select:none; transition: all 0.2s ease;';
            header.innerHTML = `
                <span>${cat} <span style="font-size:10px; color:var(--text-muted); font-weight:normal; text-transform:none; margin-left:4px;">(${categories[cat].length})</span></span>
                <span class="category-arrow" style="font-size:10px; color:var(--text-muted); transition: transform 0.2s ease; display: inline-block;">▶</span>
            `;

            const productsContainer = document.createElement('div');
            productsContainer.style.cssText = 'display: none; padding: 12px; flex-direction: column; gap: 10px; border-top: 1px solid var(--border); background: rgba(0,0,0,0.1);';

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

    // =============================================
    // === EVENT LISTENERS (Viewport, Inputs) ===
    // =============================================
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

        if (resetView) {
            resetView.addEventListener('click', () => {
                currentRotateX = -10;
                currentRotateY = -20;
                currentZoom = 1;
                updateTransform();
            });
        }

        const viewportContainer = document.querySelector('.viewport');

        viewportContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        let isPanning = false;
        let startPanX = 0;
        let startPanY = 0;
        let startScrollLeft = 0;
        let startScrollTop = 0;

        viewportContainer.addEventListener('mousedown', (e) => {
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('.draggable-product') || e.target.closest('.placed-product') || e.target.closest('.product-hover-card') || e.target.closest('.dashboard-overlay') || e.target.closest('.product-modal') || e.target.closest('#product-details-modal')) return;

            if (e.button === 2) {
                isDragging = true;
                startMouseX = e.clientX;
                startMouseY = e.clientY;
                startRotateX = currentRotateX;
                startRotateY = currentRotateY;
                viewportContainer.style.cursor = 'grabbing';
            } else if (e.button === 0) {
                isPanning = true;
                startPanX = e.clientX;
                startPanY = e.clientY;
                startScrollLeft = viewportContainer.scrollLeft;
                startScrollTop = viewportContainer.scrollTop;
                viewportContainer.style.cursor = 'move';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = e.clientX - startMouseX;
                const deltaY = e.clientY - startMouseY;

                currentRotateY = startRotateY + deltaX * 0.18;
                currentRotateX = startRotateX - deltaY * 0.18;
                currentRotateX = Math.max(-60, Math.min(60, currentRotateX));

                updateTransform();
            } else if (isPanning) {
                const deltaX = e.clientX - startPanX;
                const deltaY = e.clientY - startPanY;

                viewportContainer.scrollLeft = startScrollLeft - deltaX;
                viewportContainer.scrollTop = startScrollTop - deltaY;
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            isPanning = false;
            viewportContainer.style.cursor = 'default';
        });

        viewportContainer.addEventListener('wheel', (e) => {
            if (e.target.closest('.dashboard-overlay')) return;

            e.preventDefault();
            if (e.shiftKey) {
                viewportContainer.scrollLeft += e.deltaY;
                return;
            }
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

        // --- Inputs Sync ---
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

        // Report Modal
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

        // Excel Download
        const btnDownloadXlsx = document.getElementById('btn-download-xlsx');
        if (btnDownloadXlsx) {
            btnDownloadXlsx.addEventListener('click', downloadCurrentGondolaExcel);
        }

        // Undo / Redo Click Handlers
        const btnUndo = document.getElementById('btn-undo');
        if (btnUndo) {
            btnUndo.addEventListener('click', () => {
                state.undo();
            });
        }
        const btnRedo = document.getElementById('btn-redo');
        if (btnRedo) {
            btnRedo.addEventListener('click', () => {
                state.redo();
            });
        }

        // Keyboard Shortcuts for Undo/Redo (Ctrl+Z / Ctrl+Y)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' || e.key === 'Z') {
                    e.preventDefault();
                    state.undo();
                } else if (e.key === 'y' || e.key === 'Y') {
                    e.preventDefault();
                    state.redo();
                }
            }
        });

        state.on('gondola:updated', renderGondola);
        state.on('dashboard:update', updateDashboard);
    }

    // =============================================
    // === REPORTS ===
    // =============================================
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
                            for (let i = 0; i < (p.stacks || 1); i++) {
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
            reportContent.innerHTML = `<p style="color:#ef4444; text-align:center; padding:20px; font-weight:600;">Ocurrió un error al generar el informe: ${error.message}.</p>`;
        }
    }

    // =============================================
    // === EXCEL HELPERS ===
    // =============================================
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

        return { rows: Object.values(summary), grandTotalUnits, grandTotalValue, uniqueSkusCount: uniqueSkus.size };
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

    function downloadCurrentGondolaExcel() {
        const summary = buildGondolaProductSummary(state.gondola);
        if (summary.rows.length === 0) {
            alert('No hay productos en el planograma actual para exportar.');
            return;
        }
        const store = state.stores.find(s => s.id === state.currentStoreId);
        const storeName = store ? store.name : '';
        const activeGondolaObj = state.library.find(p => p.id === state.currentGondolaId);
        const gondolaName = activeGondolaObj ? activeGondolaObj.name : 'Góndola';
        const category = activeGondolaObj ? (activeGondolaObj.category || 'N/A') : 'N/A';
        const aisle = activeGondolaObj ? (activeGondolaObj.aisle || 'N/A') : 'N/A';
        const description = activeGondolaObj ? (activeGondolaObj.description || 'N/A') : 'N/A';
        
        const metadata = {
            storeName,
            gondolaName,
            type: state.gondola.type || 'Pared',
            dimensions: `${state.gondola.width || 0}x${state.gondola.height || 0}x${state.gondola.shelfDepth || 0} cm`,
            category,
            aisle,
            description,
            date: new Date().toLocaleString()
        };
        downloadExcelWorkbook('Góndola', summary.rows, `Reporte_Planograma_${gondolaName.replace(/\s+/g, '_')}`, metadata);
    }

    // =============================================
    // === 2D IMAGE GENERATOR (for PDF) ===
    // =============================================
    function adjustColor(colorStr, amt) {
        let hex = String(colorStr).replace('#', '');
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
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

    function generateGondola2DImage() {
        const originalGondola = state.gondola;
        const activeGondolaObj = state.library.find(p => p.id === state.currentGondolaId);
        const tempName = activeGondolaObj ? activeGondolaObj.name : 'Góndola';

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

        // Uprights
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
        const typeColorsMap = {
            pared: '#f8fafc',
            central: '#ffffff',
            cabecera: '#fdfdfd',
            refrigerado: '#f0f9ff'
        };
        ctx.fillStyle = typeColorsMap[g.type] || '#f8fafc';
        ctx.fillRect(gondolaX, gondolaY, availableW, gondolaH);

        if (g.type === 'refrigerado') {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
            ctx.fillRect(gondolaX, gondolaY, availableW, gondolaH);
        }

        // Pegboard for perchero shelves
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

        // Draw products
        g.shelves.forEach((s, sIdx) => {
            const isPerchero = s.type === 'perchero';
            const sYCanvas = gondolaY + gondolaH - (s.y * scale);
            const shelfThicknessPx = (isPerchero ? 1 : g.shelfThickness) * scale;

            s.products.forEach(p => {
                let layersToProcess = p.layers || [];
                let currentY = 0;

                layersToProcess.forEach((layer) => {
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

        // Draw shelf plates
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
            ctx.fillText(isPerchero ? `PERCHERO N${sIdx + 1}` : `PLANCHA N${sIdx + 1}`, gondolaX + 8, sYCanvas - shelfThicknessPx / 2);
        });

        // Dimension Lines
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#475569';

        // Width
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
        ctx.fillRect(gondolaX + availableW / 2 - textWidth / 2, dimY - 8, textWidth, 16);
        ctx.fillStyle = '#1e293b';
        ctx.fillText(textLabel, gondolaX + availableW / 2, dimY);

        // Height
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
        ctx.translate(dimX + 8, gondolaY + gondolaH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#ffffff';
        const heightLabel = `${g.height} cm`;
        const hTextW = ctx.measureText(heightLabel).width + 8;
        ctx.fillRect(-hTextW / 2, -8, hTextW, 16);
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(heightLabel, 0, 0);
        ctx.restore();

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, canvasW, canvasH);

        return canvas.toDataURL('image/jpeg', 0.95);
    }

    // =============================================
    // === PDF DOWNLOAD (Single Gondola) ===
    // =============================================
    function downloadPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');

        const activeGondola = state.library.find(p => p.id === state.currentGondolaId);
        const gondolaName = activeGondola ? activeGondola.name : 'Góndola';

        doc.setFillColor(0, 150, 57);
        doc.rect(0, 0, 595, 15, 'F');

        doc.setFontSize(20);
        doc.setTextColor(0, 150, 57);
        doc.text('REPORTE DE PLANOGRAMA', 40, 42);
        
        const store = state.stores.find(s => s.id === state.currentStoreId);
        const storeName = store ? store.name : 'Tienda';
        
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`Tienda: ${storeName}`, 40, 60);

        let metaParts = [];
        metaParts.push(`Mueble: ${gondolaName}`);
        metaParts.push(`Tipo: ${(state.gondola.type || 'Pared').toUpperCase()}`);
        if (activeGondola && activeGondola.category) {
            metaParts.push(`Categoría: ${activeGondola.category}`);
        }
        if (activeGondola && activeGondola.aisle) {
            metaParts.push(`Pasillo/Ubicación: ${activeGondola.aisle}`);
        }
        doc.text(metaParts.join('  |  '), 40, 75);

        let secondMetaParts = [];
        secondMetaParts.push(`Dimensiones: ${state.gondola.width || 0}x${state.gondola.height || 0}x${state.gondola.shelfDepth || 0} cm`);
        secondMetaParts.push(`Fecha: ${new Date().toLocaleString()}`);
        if (activeGondola && activeGondola.description) {
            secondMetaParts.push(`Información Adicional: ${activeGondola.description}`);
        }
        doc.text(secondMetaParts.join('  |  '), 40, 90);

        const planogramImgData = generateGondola2DImage();

        const canvasScale = 710 / (state.gondola.width || 100);
        const canvasH = 120 + (state.gondola.height || 100) * canvasScale;

        const displayW = 515;
        let finalW = displayW;
        let finalH = (canvasH / 800) * finalW;

        const maxImageH = 600;
        if (finalH > maxImageH) {
            finalH = maxImageH;
            finalW = (800 / canvasH) * finalH;
        }

        const imgX = 40 + (displayW - finalW) / 2;
        const imgY = 110 + (600 - finalH) / 2;
        doc.addImage(planogramImgData, 'JPEG', imgX, imgY, finalW, finalH);

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
            didParseCell: function (data) {
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
                        if (data.column.index === 0) data.cell.styles.halign = 'right';
                    } else if (txt.indexOf('Total ') === 0) {
                        data.cell.styles.fillColor = [235, 247, 239];
                        data.cell.styles.textColor = [0, 150, 57];
                        data.cell.styles.fontStyle = 'bold';
                        if (data.column.index === 0) data.cell.styles.halign = 'right';
                    } else if (txt.indexOf('TOTAL GLOBAL') === 0) {
                        data.cell.styles.fillColor = [0, 150, 57];
                        data.cell.styles.textColor = [255, 255, 255];
                        data.cell.styles.fontStyle = 'bold';
                        if (data.column.index === 0) data.cell.styles.halign = 'right';
                    }
                }
            }
        });

        doc.save(`Reporte_Planograma_${gondolaName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    }

    // =============================================
    // === PRODUCT DETAILS MODAL ===
    // =============================================
    let currentModalTarget = null;

    function openProductModal(product, layer, shelfIdx, pIdx, unitsInZ, dims, lIdx) {
        currentModalTarget = { shelfIdx, pIdx, lIdx };
        document.getElementById('modal-product-name').innerText = product.name;
        document.getElementById('modal-product-y').innerText = "Capa " + (lIdx + 1);
        document.getElementById('modal-product-z').innerText = unitsInZ;

        const inputFacings = document.getElementById('input-modal-facings');
        if (inputFacings) inputFacings.value = layer.facings;

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

    // =============================================
    // === INIT ===
    // =============================================
    setupEventListeners();
    initAppContent();
});
