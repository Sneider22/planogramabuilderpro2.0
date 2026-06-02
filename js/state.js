/* ============================================
   STATE.JS - Estado Global con Librería de Mobiliario
   ============================================ */

class AppState {
    constructor() {
        this._listeners = {};

        // Stores Logic
        try {
            this.stores = JSON.parse(localStorage.getItem('planogram_stores')) || [];
            if (!Array.isArray(this.stores)) this.stores = [];
        } catch (e) {
            this.stores = [];
        }

        try {
            const savedAutoId = localStorage.getItem('planogram_next_store_auto_id');
            if (savedAutoId !== null) {
                this.nextStoreAutoId = parseInt(savedAutoId, 10);
            } else {
                let maxNum = 0;
                this.stores.forEach(s => {
                    const parts = s.id.split('-');
                    if (parts.length === 2 && !isNaN(parts[1])) {
                        const num = parseInt(parts[1], 10);
                        if (num < 10000000 && num > maxNum) {
                            maxNum = num;
                        }
                    }
                });
                this.nextStoreAutoId = maxNum + 1;
                localStorage.setItem('planogram_next_store_auto_id', this.nextStoreAutoId);
            }
        } catch (e) {
            this.nextStoreAutoId = 1;
        }

        this.currentStoreId = null;
        this.currentGondolaId = null;

        // Configuración Actual (Actúa como el mueble seleccionado)
        this.gondola = this._getDefaultGondola();

        // Catálogo de Productos Extendido (SAP Mock) - Enfoque Locatel Farmacia y Bienestar
        this.products = [
            // Farmacia
            { id: 'P001', sku: 'SAP-FAR01', name: 'Paracetamol 500mg (10 Tab)', width: 10, height: 6, depth: 2, price: 1.20, color: '#3b82f6', category: 'Farmacia' },
            { id: 'P002', sku: 'SAP-FAR02', name: 'Ibuprofeno 400mg (10 Tab)', width: 11, height: 7, depth: 2, price: 1.80, color: '#ef4444', category: 'Farmacia' },
            { id: 'P003', sku: 'SAP-FAR03', name: 'Jarabe Antigripal 120ml', width: 6, height: 14, depth: 6, price: 4.50, color: '#10b981', category: 'Farmacia' },
            { id: 'P004', sku: 'SAP-FAR04', name: 'Alcohol Antiséptico 70% 500ml', width: 8, height: 18, depth: 8, price: 2.10, color: '#06b6d4', category: 'Farmacia' },
            { id: 'P005', sku: 'SAP-FAR05', name: 'Curitas Band-Aid (Caja 30)', width: 8, height: 12, depth: 3, price: 1.50, color: '#f59e0b', category: 'Farmacia' },
            { id: 'P006', sku: 'SAP-FAR06', name: 'Venda Elástica 10cm x 5m', width: 7, height: 7, depth: 7, price: 3.20, color: '#d97706', category: 'Farmacia' },
            { id: 'P007', sku: 'SAP-FAR07', name: 'Alcohol 70% 500ml', width: 10, height: 6, depth: 2, price: 1.20, color: '#3b82f6', category: 'Farmacia' },
            { id: 'P008', sku: 'SAP-FAR08', name: 'Ácido Acetilsalicílico 500mg (10 Tab)', width: 11, height: 7, depth: 2, price: 1.80, color: '#ef4444', category: 'Farmacia' },
            { id: 'P009', sku: 'SAP-FAR09', name: 'Venda Elástica 10cm x 5m', width: 6, height: 14, depth: 6, price: 4.50, color: '#10b981', category: 'Farmacia' },
            { id: 'P010', sku: 'SAP-FAR10', name: 'Crema Antitranspirante', width: 8, height: 18, depth: 8, price: 2.10, color: '#06b6d4', category: 'Farmacia' },
            { id: 'P011', sku: 'SAP-FAR11', name: 'Gel de Ducha', width: 8, height: 12, depth: 3, price: 1.50, color: '#f59e0b', category: 'Farmacia' },


            // Cuidado Personal
            { id: 'P012', sku: 'SAP-CUI01', name: 'Champú Herbal Locatel 400ml', width: 7, height: 21, depth: 5, price: 5.40, color: '#047857', category: 'Cuidado Personal' },
            { id: 'P013', sku: 'SAP-CUI02', name: 'Acondicionador Brillo 400ml', width: 7, height: 21, depth: 5, price: 5.60, color: '#10b981', category: 'Cuidado Personal' },
            { id: 'P014', sku: 'SAP-CUI03', name: 'Crema Dental Triple Acción', width: 18, height: 4, depth: 4, price: 2.30, color: '#dc2626', category: 'Cuidado Personal' },
            { id: 'P015', sku: 'SAP-CUI04', name: 'Enjuague Bucal Menta 500ml', width: 9, height: 22, depth: 6, price: 6.90, color: '#0ea5e9', category: 'Cuidado Personal' },
            { id: 'P016', sku: 'SAP-CUI05', name: 'Desodorante Invisible Roll-on', width: 5, height: 11, depth: 5, price: 3.50, color: '#64748b', category: 'Cuidado Personal' },
            { id: 'P017', sku: 'SAP-CUI06', name: 'Crema Corporal Dermacare 200ml', width: 8, height: 16, depth: 4, price: 8.90, color: '#f1f5f9', category: 'Cuidado Personal' },

            // Nutrición & Suplementos
            { id: 'P018', sku: 'SAP-NUT01', name: 'Vitamina C Efervescente 1000mg', width: 4, height: 14, depth: 4, price: 6.50, color: '#f97316', category: 'Nutrición & Suplementos' },
            { id: 'P019', sku: 'SAP-NUT02', name: 'Omega 3 Premium (60 Cáps)', width: 6, height: 12, depth: 6, price: 14.90, color: '#eab308', category: 'Nutrición & Suplementos' },
            { id: 'P020', sku: 'SAP-NUT03', name: 'Calcio + Vitamina D (90 Tab)', width: 7, height: 13, depth: 7, price: 12.50, color: '#cbd5e1', category: 'Nutrición & Suplementos' },
            { id: 'P021', sku: 'SAP-NUT04', name: 'Complejo B Forte (30 Cáps)', width: 5, height: 10, depth: 5, price: 9.80, color: '#991b1b', category: 'Nutrición & Suplementos' },
            { id: 'P022', sku: 'SAP-NUT05', name: 'Proteína Whey Fit 500g', width: 14, height: 22, depth: 14, price: 29.90, color: '#111827', category: 'Nutrición & Suplementos' },

            // Mamá & Bebé
            { id: 'P023', sku: 'SAP-BEB01', name: 'Pañales Bebé Confort (Talla G)', width: 22, height: 26, depth: 12, price: 18.50, color: '#a5f3fc', category: 'Mamá & Bebé' },
            { id: 'P024', sku: 'SAP-BEB02', name: 'Toallitas Húmedas Sin Alcohol', width: 18, height: 5, depth: 10, price: 2.80, color: '#ecfeff', category: 'Mamá & Bebé' },
            { id: 'P025', sku: 'SAP-BEB03', name: 'Crema Antipañalitis Óxido Zinc', width: 14, height: 4, depth: 4, price: 4.90, color: '#fbcfe8', category: 'Mamá & Bebé' },
            { id: 'P026', sku: 'SAP-BEB04', name: 'Fórmula Infantil Etapa 1 400g', width: 10, height: 12, depth: 10, price: 11.20, color: '#fef08a', category: 'Mamá & Bebé' },

            // Bebidas & Snacks
            { id: 'P027', sku: 'SAP-ALM01', name: 'Barra de Proteína Avena & Miel', width: 14, height: 4, depth: 2, price: 1.50, color: '#d97706', category: 'Bebidas & Snacks' },
            { id: 'P028', sku: 'SAP-ALM02', name: 'Bebida Isotónica Hidratante', width: 7, height: 22, depth: 7, price: 2.20, color: '#3b82f6', category: 'Bebidas & Snacks' },
            { id: 'P029', sku: 'SAP-ALM03', name: 'Agua de Coco 100% Organica', width: 6, height: 15, depth: 6, price: 3.10, color: '#22c55e', category: 'Bebidas & Snacks' },
            { id: 'P030', sku: 'SAP-ALM04', name: 'Té Verde Matcha Orgánico', width: 8, height: 12, depth: 5, price: 5.90, color: '#86efac', category: 'Bebidas & Snacks' },
        ];

        // Librería de Presets (Depende de la tienda seleccionada)
        this.library = [];

        this._nextProductId = 31;
        this._buildShelves();
    }

    _getDefaultGondola() {
        return {
            type: 'pared', // pared, central, cabecera, refrigerado
            width: 100,
            height: 210,
            depth: 40,
            numShelves: 5,
            gapBetweenShelves: 35,
            baseHeight: 20,
            shelfThickness: 2,
            shelfDepth: 40,
            shelfWidth: 100,
            autoPack: true,
            shelves: []
        };
    }

    // --- Store Management ---
    createStore(name, customId = '') {
        let storeId;
        if (customId && customId.trim()) {
            storeId = 'store-' + customId.trim();
        } else {
            const formattedNum = String(this.nextStoreAutoId).padStart(4, '0');
            storeId = 'store-' + formattedNum;
            this.nextStoreAutoId++;
            localStorage.setItem('planogram_next_store_auto_id', this.nextStoreAutoId);
        }

        const newStore = {
            id: storeId,
            name: name,
            createdAt: Date.now(),
            library: []
        };
        this.stores.push(newStore);
        this._saveStores();
        return newStore;
    }

    updateStoreDetails(oldId, newName, newId) {
        if (oldId !== newId && this.stores.some(s => s.id === newId)) {
            return { success: false, reason: 'Ya existe una tienda con este ID.' };
        }

        const store = this.stores.find(s => s.id === oldId);
        if (store) {
            store.name = newName;
            store.id = newId;
            this._saveStores();

            if (this.currentStoreId === oldId) {
                this.currentStoreId = newId;
                localStorage.setItem('planogram_store_id', newId);
            }

            return { success: true };
        }
        return { success: false, reason: 'Tienda no encontrada.' };
    }

    deleteStore(id) {
        this.stores = this.stores.filter(s => s.id !== id);
        this._saveStores();
        if (this.currentStoreId === id) {
            this.currentStoreId = null;
            localStorage.removeItem('planogram_store_id');
        }
        return { success: true };
    }

    selectStore(id) {
        this.currentStoreId = id;
        this.currentGondolaId = null;
        const store = this.stores.find(s => s.id === id);
        if (store) {
            if (!store.library) {
                store.library = [];
            }
            this.library = store.library;
            this.emit('store:selected', store);
            this.emit('library:updated', this.library);
        }
    }

    _saveStores() {
        localStorage.setItem('planogram_stores', JSON.stringify(this.stores));
    }

    // --- Gondola Persistence (Auto-save) ---
    createNewGondola(name = 'Nueva Góndola', aisle = '', category = '', description = '') {
        if (!this.currentStoreId) return;
        const newId = 'gondola-' + Date.now();
        const newGondolaData = {
            id: newId,
            name: name,
            aisle: (aisle || '').trim(),
            category: (category || '').trim(),
            description: (description || '').trim(),
            config: this._getDefaultGondola()
        };

        this.library.push(newGondolaData);
        this.currentGondolaId = newId;
        this.gondola = JSON.parse(JSON.stringify(newGondolaData.config));
        this._buildShelves();

        // Inicializar historial
        this.undoStack = [JSON.stringify(this.gondola)];
        this.redoStack = [];

        const store = this.stores.find(s => s.id === this.currentStoreId);
        if (store) {
            store.library = this.library;
            this._saveStores();
        }

        this.emit('library:updated', this.library);
        this.emit('gondola:updated', this.gondola);
        this.emit('dashboard:update');
        return newId;
    }

    loadGondola(id) {
        const preset = this.library.find(p => p.id === id);
        if (preset) {
            this.currentGondolaId = id;
            this.gondola = JSON.parse(JSON.stringify(preset.config));
            if (this.gondola.autoPack === undefined) {
                this.gondola.autoPack = true;
            }
            this._buildShelves();
            this.undoStack = [];
            this.redoStack = [];
            this.emit('gondola:updated', this.gondola);
            this.emit('dashboard:update');
        }
    }

    toggleAutoPack() {
        if (!this.gondola) return;
        const previousState = JSON.stringify(this.gondola);
        this.gondola.autoPack = !this.gondola.autoPack;
        if (this.gondola.autoPack) {
            // Re-pack all standard shelves
            this.gondola.shelves.forEach((shelf, idx) => {
                if (shelf.type === 'plancha') {
                    this._recalculateShelfX(idx);
                }
            });
        }
        this.pushToUndoStack(previousState);
        this._autoSave();
        this.emit('gondola:updated', this.gondola);
        this.emit('dashboard:update');
    }

    duplicateGondola() {
        if (!this.currentStoreId || !this.currentGondolaId) return;
        const currentData = this.library.find(p => p.id === this.currentGondolaId);
        if (!currentData) return;

        const newId = 'gondola-' + Date.now();
        const newGondolaData = {
            id: newId,
            name: currentData.name + ' (Copia)',
            aisle: (currentData.aisle || '').trim(),
            category: (currentData.category || '').trim(),
            description: (currentData.description || '').trim(),
            config: JSON.parse(JSON.stringify(this.gondola))
        };

        this.library.push(newGondolaData);
        this.currentGondolaId = newId;

        const store = this.stores.find(s => s.id === this.currentStoreId);
        if (store) {
            store.library = this.library;
            this._saveStores();
        }

        this.emit('library:updated', this.library);
        this.emit('gondola:updated', this.gondola);
        this.emit('dashboard:update');
    }

    deleteGondola(id) {
        if (!this.currentStoreId) return;
        this.library = this.library.filter(p => p.id !== id);

        const store = this.stores.find(s => s.id === this.currentStoreId);
        if (store) {
            store.library = this.library;
            this._saveStores();
        }

        this.emit('library:updated', this.library);
    }

    renameGondola(id, newName, aisle = '', category = '', description = '') {
        if (!this.currentStoreId) return;
        const gondolaObj = this.library.find(p => p.id === id);
        if (gondolaObj) {
            gondolaObj.name = newName;
            gondolaObj.aisle = (aisle || '').trim();
            gondolaObj.category = (category || '').trim();
            gondolaObj.description = (description || '').trim();
            const store = this.stores.find(s => s.id === this.currentStoreId);
            if (store) {
                store.library = this.library;
                this._saveStores();
            }
            this.emit('library:updated', this.library);
            this.emit('dashboard:update');
        }
    }

    _autoSave() {
        if (!this.currentStoreId || !this.currentGondolaId) return;
        const preset = this.library.find(p => p.id === this.currentGondolaId);
        if (preset) {
            preset.config = JSON.parse(JSON.stringify(this.gondola));
            const store = this.stores.find(s => s.id === this.currentStoreId);
            if (store) {
                store.library = this.library;
                this._saveStores();
            }
        }
    }

    pushToUndoStack(serializedState) {
        if (!serializedState) return;
        if (!this.undoStack) this.undoStack = [];
        if (!this.redoStack) this.redoStack = [];

        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === serializedState) {
            return;
        }

        this.undoStack.push(serializedState);
        if (this.undoStack.length > 30) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    undo() {
        if (!this.undoStack || this.undoStack.length === 0) {
            return { success: false, reason: 'Nada para deshacer' };
        }
        if (!this.redoStack) this.redoStack = [];
        this.redoStack.push(JSON.stringify(this.gondola));

        const prev = this.undoStack.pop();
        this.gondola = JSON.parse(prev);
        
        this._autoSave();
        this.emit('gondola:updated', this.gondola);
        this.emit('dashboard:update');
        return { success: true };
    }

    redo() {
        if (!this.redoStack || this.redoStack.length === 0) {
            return { success: false, reason: 'Nada para rehacer' };
        }
        if (!this.undoStack) this.undoStack = [];
        this.undoStack.push(JSON.stringify(this.gondola));

        const next = this.redoStack.pop();
        this.gondola = JSON.parse(next);

        this._autoSave();
        this.emit('gondola:updated', this.gondola);
        this.emit('dashboard:update');
        return { success: true };
    }

    // --- Gondola Logic ---
    updateGondola(updates) {
        const previousState = JSON.stringify(this.gondola);
        const shouldRecalculate = (updates.numShelves !== undefined || updates.gapBetweenShelves !== undefined || updates.baseHeight !== undefined);
        Object.assign(this.gondola, updates);
        if (updates.width !== undefined) this.gondola.shelfWidth = updates.width;
        if (updates.depth !== undefined) this.gondola.shelfDepth = updates.depth;

        this._buildShelves(shouldRecalculate);
        this.pushToUndoStack(previousState);
        this._autoSave();
        this.emit('gondola:updated', this.gondola);
        this.emit('dashboard:update');
    }

    emptyGondola() {
        if (this.gondola.shelves) {
            const previousState = JSON.stringify(this.gondola);
            this.gondola.shelves.forEach(shelf => {
                shelf.products = [];
            });
            this.pushToUndoStack(previousState);
            this._autoSave();
            this.emit('gondola:updated', this.gondola);
            this.emit('dashboard:update');
        }
    }

    setShelfType(shelfIndex, type) {
        if (this.gondola.shelves && this.gondola.shelves[shelfIndex]) {
            const previousState = JSON.stringify(this.gondola);
            this.gondola.shelves[shelfIndex].type = type;
            this._recalculateShelfX(shelfIndex);
            this.pushToUndoStack(previousState);
            this._autoSave();
            this.emit('gondola:updated', this.gondola);
            this.emit('dashboard:update');
        }
    }

    setShelfHookSpacing(shelfIndex, spacing) {
        if (this.gondola.shelves && this.gondola.shelves[shelfIndex]) {
            const previousState = JSON.stringify(this.gondola);
            this.gondola.shelves[shelfIndex].hookSpacing = parseFloat(spacing) || 15;
            this._recalculateShelfX(shelfIndex);
            this.pushToUndoStack(previousState);
            this._autoSave();
            this.emit('gondola:updated', this.gondola);
            this.emit('dashboard:update');
        }
    }

    setShelfGap(shelfIndex, newGap) {
        if (!this.gondola.shelves || !this.gondola.shelves[shelfIndex]) return;
        newGap = parseFloat(newGap);
        if (isNaN(newGap) || newGap < 0) return;

        const previousState = JSON.stringify(this.gondola);

        const baseHeight = parseFloat(this.gondola.baseHeight) || 20;
        const shelfThickness = parseFloat(this.gondola.shelfThickness) || 2;
        const prevY = shelfIndex === 0 ? baseHeight : parseFloat(this.gondola.shelves[shelfIndex - 1].y) + shelfThickness;
        const currentGap = parseFloat(this.gondola.shelves[shelfIndex].y) - prevY;
        const delta = newGap - currentGap;

        // Shift this shelf and all shelves above it
        for (let idx = shelfIndex; idx < this.gondola.shelves.length; idx++) {
            this.gondola.shelves[idx].y = parseFloat(this.gondola.shelves[idx].y) + delta;
        }

        this.pushToUndoStack(previousState);
        this._autoSave();
        this.emit('gondola:updated', this.gondola);
        this.emit('dashboard:update');
    }

    setShelfDepth(shelfIndex, depth) {
        if (this.gondola.shelves && this.gondola.shelves[shelfIndex]) {
            const previousState = JSON.stringify(this.gondola);
            this.gondola.shelves[shelfIndex].depth = parseFloat(depth) || this.gondola.shelfDepth;
            this.pushToUndoStack(previousState);
            this._autoSave();
            this.emit('gondola:updated', this.gondola);
            this.emit('dashboard:update');
        }
    }

    _buildShelves(recalculate = false) {
        const g = this.gondola;
        const oldShelves = g.shelves || [];
        g.shelves = [];

        for (let i = 0; i < g.numShelves; i++) {
            const oldShelf = oldShelves[i];
            let yPos;
            if (!recalculate && oldShelf && oldShelf.y !== undefined && !isNaN(parseFloat(oldShelf.y))) {
                yPos = parseFloat(oldShelf.y);
            } else {
                yPos = parseFloat(g.baseHeight) + i * (parseFloat(g.gapBetweenShelves) + parseFloat(g.shelfThickness));
            }
            g.shelves.push({
                id: `shelf-${i}`,
                index: i,
                y: yPos,
                type: oldShelf ? (oldShelf.type || 'plancha') : 'plancha',
                hookSpacing: oldShelf ? (oldShelf.hookSpacing || 15) : 15,
                depth: oldShelf ? (oldShelf.depth !== undefined ? oldShelf.depth : g.shelfDepth) : g.shelfDepth,
                products: oldShelf ? oldShelf.products : []
            });
        }
    }

    // --- Helpers ---
    on(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
    }

    emit(event, data) {
        (this._listeners[event] || []).forEach(cb => cb(data));
    }

    getProductById(id) { return this.products.find(p => p.id === id); }

    getPlacedDimensions(productId, orientation = 0) {
        const prod = this.getProductById(productId);
        if (!prod) return { width: 0, height: 0, depth: 0 };

        let w = prod.width, h = prod.height, d = prod.depth;
        switch (orientation) {
            case 1: return { width: h, height: w, depth: d }; // side (xy)
            case 2: return { width: d, height: h, depth: w }; // depth-facing (xz)
            case 3: return { width: d, height: w, depth: h }; // depth-facing side
            case 4: return { width: w, height: d, depth: h }; // top-facing (yz)
            case 5: return { width: h, height: d, depth: w }; // top-facing side
            default: return { width: w, height: h, depth: d }; // normal
        }
    }

    getShelfUsableHeight(shelfIndex) {
        const g = this.gondola;
        const shelf = g.shelves[shelfIndex];
        if (!shelf) return 0;
        const nextShelf = g.shelves[shelfIndex + 1];
        const ceiling = nextShelf ? nextShelf.y : g.height;
        return ceiling - (shelf.y + g.shelfThickness);
    }

    getShelfUsedWidth(shelfIndex) {
        const shelf = this.gondola.shelves[shelfIndex];
        if (!shelf) return 0;
        return shelf.products.reduce((sum, p) => {
            if (!p.layers && p.productId) {
                const dims = this.getPlacedDimensions(p.productId, p.orientation || 0);
                return sum + (dims.width * (p.facings || 1));
            }
            if (!p.layers || p.layers.length === 0) return sum;
            const baseLayer = p.layers[0];
            const dims = this.getPlacedDimensions(baseLayer.productId, baseLayer.orientation || 0);
            return sum + (dims.width * baseLayer.facings);
        }, 0);
    }

    getShelfAvailableWidth(shelfIndex) {
        return this.gondola.shelfWidth - this.getShelfUsedWidth(shelfIndex);
    }

    getPlacementBoundingBox(shelfIndex, placement) {
        const shelf = this.gondola.shelves[shelfIndex];
        const g = this.gondola;

        let w = 0;
        let h = 0;

        if (placement.layers && placement.layers.length > 0) {
            const baseLayer = placement.layers[0];
            const baseDims = this.getPlacedDimensions(baseLayer.productId, baseLayer.orientation || 0);
            w = baseDims.width * baseLayer.facings;

            placement.layers.forEach(layer => {
                const layerDims = this.getPlacedDimensions(layer.productId, layer.orientation || 0);
                h += layerDims.height;
            });
        } else if (!placement.layers && placement.productId) {
            const dims = this.getPlacedDimensions(placement.productId, placement.orientation || 0);
            w = dims.width * (placement.facings || 1);
            h = dims.height;
        }

        let yBottom = 0;
        let yTop = 0;

        if (shelf.type === 'perchero') {
            yBottom = shelf.y - h * 0.85;
            yTop = shelf.y + h * 0.15;
        } else {
            yBottom = shelf.y + g.shelfThickness;
            yTop = yBottom + h;
        }

        return {
            x1: placement.x,
            x2: placement.x + w,
            y1: yBottom,
            y2: yTop,
            width: w,
            height: h
        };
    }

    getPlacementWidth(p) {
        if (!p) return 0;
        if (p.layers && p.layers.length > 0) {
            const baseLayer = p.layers[0];
            const dims = this.getPlacedDimensions(baseLayer.productId, baseLayer.orientation || 0);
            return dims.width * baseLayer.facings;
        }
        const dims = this.getPlacedDimensions(p.productId, p.orientation || 0);
        return dims.width * (p.facings || 1);
    }

    checkShelfCollisions(shelfIndex) {
        const shelf = this.gondola.shelves[shelfIndex];
        if (!shelf) return { valid: true };

        const isPerchero = shelf.type === 'perchero';
        const shelfWidth = this.gondola.shelfWidth;

        if (isPerchero) {
            const spacing = shelf.hookSpacing || 15;
            const numHooks = Math.floor(shelfWidth / spacing);
            const margin = (shelfWidth - (numHooks - 1) * spacing) / 2;

            // 1. Check if there are more products than hooks
            if (shelf.products.length > numHooks) {
                return {
                    valid: false,
                    reason: `No hay suficientes ganchos disponibles. Caben ${numHooks} ganchos pero hay ${shelf.products.length} productos.`
                };
            }

            // 2. Check each product for boundaries and overlap
            for (let i = 0; i < shelf.products.length; i++) {
                const p1 = shelf.products[i];
                if (p1.hookIndex === undefined) continue;

                const w1 = this.getPlacementWidth(p1);
                if (w1 > spacing) {
                    const name = this._getProductName(p1);
                    return {
                        valid: false,
                        reason: `Ancho excedido: El producto "${name}" (${w1}cm de ancho) supera la separación entre ganchos (${spacing}cm) en este nivel. Coloque un producto más pequeño o aumente la separación entre ganchos.`
                    };
                }
                const hookX = margin + p1.hookIndex * spacing;
                const leftEdge = hookX - w1 / 2;
                const rightEdge = hookX + w1 / 2;

                if (leftEdge < 0) {
                    return {
                        valid: false,
                        reason: `Colisión de borde: El producto en el Gancho ${p1.hookIndex + 1} (${w1}cm de ancho) sobresaldría ${Math.abs(leftEdge).toFixed(1)}cm por el lateral izquierdo.`
                    };
                }
                if (rightEdge > shelfWidth) {
                    return {
                        valid: false,
                        reason: `Colisión de borde: El producto en el Gancho ${p1.hookIndex + 1} (${w1}cm de ancho) sobresaldría ${(rightEdge - shelfWidth).toFixed(1)}cm por el lateral derecho.`
                    };
                }

                // Check against other hooks
                for (let j = i + 1; j < shelf.products.length; j++) {
                    const p2 = shelf.products[j];
                    if (p2.hookIndex === undefined) continue;

                    const w2 = this.getPlacementWidth(p2);
                    const hookX2 = margin + p2.hookIndex * spacing;
                    const leftEdge2 = hookX2 - w2 / 2;
                    const rightEdge2 = hookX2 + w2 / 2;

                    // Overlap
                    if (leftEdge < rightEdge2 && rightEdge > leftEdge2) {
                        return {
                            valid: false,
                            reason: `Colisión física: El producto en el Gancho ${p1.hookIndex + 1} choca con el producto en el Gancho ${p2.hookIndex + 1}.`
                        };
                    }
                }
            }
        } else {
            // Standard Shelf
            for (let i = 0; i < shelf.products.length; i++) {
                const pA = shelf.products[i];
                const wA = this.getPlacementWidth(pA);
                const xA1 = pA.x;
                const xA2 = pA.x + wA;

                if (xA1 < 0 || xA2 > shelfWidth) {
                    return {
                        valid: false,
                        reason: `El producto sobresale de los límites de la repisa (Ancho repisa: ${shelfWidth}cm, Ocupa: ${xA1.toFixed(1)} - ${xA2.toFixed(1)}cm).`
                    };
                }

                for (let j = i + 1; j < shelf.products.length; j++) {
                    const pB = shelf.products[j];
                    const wB = this.getPlacementWidth(pB);
                    const xB1 = pB.x;
                    const xB2 = pB.x + wB;

                    if (xA1 < xB2 && xA2 > xB1) {
                        const nameA = this._getProductName(pA);
                        const nameB = this._getProductName(pB);
                        return {
                            valid: false,
                            reason: `Colisión física: El producto "${nameA}" (${xA1.toFixed(1)} - ${xA2.toFixed(1)}cm) choca con "${nameB}" (${xB1.toFixed(1)} - ${xB2.toFixed(1)}cm).`
                        };
                    }
                }
            }
        }

        return { valid: true };
    }

    checkGlobalCollisions() {
        const g = this.gondola;
        const placements = [];

        g.shelves.forEach(shelf => {
            shelf.products.forEach(p => {
                const box = this.getPlacementBoundingBox(shelf.index, p);
                placements.push({
                    shelfIndex: shelf.index,
                    productName: this._getProductName(p),
                    box: box
                });
            });
        });

        for (let i = 0; i < placements.length; i++) {
            for (let j = i + 1; j < placements.length; j++) {
                const pA = placements[i];
                const pB = placements[j];

                if (pA.shelfIndex === pB.shelfIndex) continue;

                const bA = pA.box;
                const bB = pB.box;

                // Pre-filtro rápido: Si no hay solapamiento vertical absoluto, ignoramos
                if (bA.y2 <= bB.y1 || bA.y1 >= bB.y2) continue;

                const xOverlap = (bA.x1 < bB.x2 && bA.x2 > bB.x1);

                if (xOverlap) {
                    return {
                        valid: false,
                        reason: `Choque de estantería: El producto colgante "${pA.productName}" (Nivel ${pA.shelfIndex + 1}) colisiona verticalmente con el producto "${pB.productName}" (Nivel ${pB.shelfIndex + 1}) de abajo debido a su longitud de suspensión.`
                    };
                }
            }
        }

        return { valid: true };
    }

    _getProductName(p) {
        let productId = p.productId;
        if (p.layers && p.layers.length > 0) {
            productId = p.layers[0].productId;
        }
        const prod = this.getProductById(productId);
        return prod ? prod.name : 'Producto';
    }

    checkHookSpacingOverlap(shelfIndex, proposedSpacing) {
        const shelf = this.gondola.shelves[shelfIndex];
        if (!shelf || shelf.type !== 'perchero') return { valid: true };

        const originalSpacing = shelf.hookSpacing || 15;
        const originalProducts = JSON.parse(JSON.stringify(shelf.products));

        const spacing = proposedSpacing;
        const numHooks = Math.floor(this.gondola.shelfWidth / spacing);
        const margin = (this.gondola.shelfWidth - (numHooks - 1) * spacing) / 2;
        const shelfWidth = this.gondola.shelfWidth;

        if (shelf.products.length > numHooks) {
            return {
                valid: false,
                reason: `No hay suficientes ganchos disponibles con ${spacing}cm de separación.\nSe necesitan ${shelf.products.length} ganchos, pero con esta separación solo caben ${numHooks}.`
            };
        }

        // Apply temporary spacing & positions
        shelf.hookSpacing = spacing;
        this._recalculateShelfX(shelfIndex);

        for (let i = 0; i < shelf.products.length; i++) {
            const p1 = shelf.products[i];

            let w1 = 0;
            if (p1.layers && p1.layers.length > 0) {
                const baseLayer = p1.layers[0];
                const dims = this.getPlacedDimensions(baseLayer.productId, baseLayer.orientation || 0);
                w1 = dims.width * baseLayer.facings;
            } else if (!p1.layers && p1.productId) {
                const dims = this.getPlacedDimensions(p1.productId, p1.orientation || 0);
                w1 = dims.width * (p1.facings || 1);
            }

            const hookX = margin + i * spacing;
            const leftEdge = hookX - w1 / 2;
            const rightEdge = hookX + w1 / 2;

            if (w1 > spacing) {
                shelf.hookSpacing = originalSpacing;
                shelf.products = originalProducts;
                this._recalculateShelfX(shelfIndex);
                return {
                    valid: false,
                    reason: `Ancho excedido: El producto en el Gancho ${i + 1} (${w1}cm de ancho) supera la nueva separación propuesta entre ganchos (${spacing}cm).`
                };
            }

            if (leftEdge < 0) {
                shelf.hookSpacing = originalSpacing;
                shelf.products = originalProducts;
                this._recalculateShelfX(shelfIndex);
                return {
                    valid: false,
                    reason: `Colisión de borde: El producto en el Gancho ${i + 1} (${w1}cm de ancho) sobresaldría ${Math.abs(leftEdge).toFixed(1)}cm por el lateral izquierdo de la góndola.`
                };
            }
            if (rightEdge > shelfWidth) {
                shelf.hookSpacing = originalSpacing;
                shelf.products = originalProducts;
                this._recalculateShelfX(shelfIndex);
                return {
                    valid: false,
                    reason: `Colisión de borde: El producto en el Gancho ${i + 1} (${w1}cm de ancho) sobresaldría ${(rightEdge - shelfWidth).toFixed(1)}cm por el lateral derecho de la góndola.`
                };
            }

            if (i < shelf.products.length - 1) {
                const p2 = shelf.products[i + 1];
                let w2 = 0;
                if (p2.layers && p2.layers.length > 0) {
                    const baseLayer = p2.layers[0];
                    const dims = this.getPlacedDimensions(baseLayer.productId, baseLayer.orientation || 0);
                    w2 = dims.width * baseLayer.facings;
                } else if (!p2.layers && p2.productId) {
                    const dims = this.getPlacedDimensions(p2.productId, p2.orientation || 0);
                    w2 = dims.width * (p2.facings || 1);
                }

                const hookX2 = margin + (i + 1) * spacing;
                const rightEdge1 = hookX + w1 / 2;
                const leftEdge2 = hookX2 - w2 / 2;

                if (rightEdge1 > leftEdge2) {
                    shelf.hookSpacing = originalSpacing;
                    shelf.products = originalProducts;
                    this._recalculateShelfX(shelfIndex);
                    return {
                        valid: false,
                        reason: `Colisión de productos: El producto en el Gancho ${i + 1} (${w1}cm) choca con el producto del Gancho ${i + 2} (${w2}cm) si reduces la distancia a ${spacing}cm.`
                    };
                }
            }
        }

        // Global vertical collision check
        const globalCheck = this.checkGlobalCollisions();
        if (!globalCheck.valid) {
            shelf.hookSpacing = originalSpacing;
            shelf.products = originalProducts;
            this._recalculateShelfX(shelfIndex);
            return {
                valid: false,
                reason: globalCheck.reason
            };
        }

        // Revert temporary spacing
        shelf.hookSpacing = originalSpacing;
        shelf.products = originalProducts;
        this._recalculateShelfX(shelfIndex);

        return { valid: true };
    }

    _recalculateShelfX(shelfIndex) {
        const shelf = this.gondola.shelves[shelfIndex];
        if (!shelf) return;

        const isPerchero = shelf.type === 'perchero';

        if (isPerchero) {
            // Static hook spacing: dynamic per shelf level!
            const spacing = shelf.hookSpacing || 15;
            const numHooks = Math.floor(this.gondola.shelfWidth / spacing);
            const margin = (this.gondola.shelfWidth - (numHooks - 1) * spacing) / 2;

            shelf.products.forEach((p, idx) => {
                if (p.hookIndex === undefined) {
                    const occupied = shelf.products
                        .filter(other => other !== p && other.hookIndex !== undefined)
                        .map(other => other.hookIndex);

                    let found = 0;
                    for (let i = 0; i < numHooks; i++) {
                        if (!occupied.includes(i)) {
                            found = i;
                            break;
                        }
                    }
                    p.hookIndex = found;
                }

                const hookX = margin + p.hookIndex * spacing;

                if (p.layers && p.layers.length > 0) {
                    const baseLayer = p.layers[0];
                    const dims = this.getPlacedDimensions(baseLayer.productId, baseLayer.orientation || 0);
                    p.x = hookX - (dims.width * baseLayer.facings) / 2;
                } else if (!p.layers && p.productId) {
                    const dims = this.getPlacedDimensions(p.productId, p.orientation || 0);
                    p.x = hookX - (dims.width * (p.facings || 1)) / 2;
                } else {
                    p.x = hookX;
                }
            });
        } else {
            // Standard left-to-right pack only if autoPack is enabled!
            if (this.gondola.autoPack) {
                let currentX = 0;
                shelf.products.forEach(p => {
                    p.x = currentX;
                    if (!p.layers && p.productId) {
                        const dims = this.getPlacedDimensions(p.productId, p.orientation || 0);
                        currentX += dims.width * (p.facings || 1);
                    } else if (p.layers && p.layers.length > 0) {
                        const baseLayer = p.layers[0];
                        const dims = this.getPlacedDimensions(baseLayer.productId, baseLayer.orientation || 0);
                        currentX += dims.width * baseLayer.facings;
                    }
                });
            }
        }
    }

    placeProduct(shelfIndex, productId, facings = 1, targetHookIndex = undefined, targetX = undefined, insertIndex = undefined) {
        const shelf = this.gondola.shelves[shelfIndex];
        if (!shelf) return { success: false, reason: 'Error interno' };

        const previousState = JSON.stringify(this.gondola);

        const dims = this.getPlacedDimensions(productId, 0);
        if (dims.width === 0) return { success: false, reason: 'Producto no encontrado' };

        const requiredWidth = dims.width * facings;
        const availableWidth = this.getShelfAvailableWidth(shelfIndex);
        const usableHeight = this.getShelfUsableHeight(shelfIndex);

        if (dims.height > usableHeight) {
            return {
                success: false,
                reason: `Producto muy alto. \nAltura: ${dims.height}cm \nEspacio libre: ${usableHeight.toFixed(1)}cm`
            };
        }

        const originalProducts = JSON.parse(JSON.stringify(shelf.products));

        if (shelf.type === 'perchero') {
            const spacing = shelf.hookSpacing || 15;
            const numHooks = Math.floor(this.gondola.shelfWidth / spacing);

            // Determine target hook index
            let targetIdx = targetHookIndex;
            const occupied = shelf.products
                .filter(other => other.hookIndex !== undefined)
                .map(other => other.hookIndex);

            if (targetIdx === undefined) {
                let found = -1;
                for (let i = 0; i < numHooks; i++) {
                    if (!occupied.includes(i)) {
                        found = i;
                        break;
                    }
                }
                if (found === -1) return { success: false, reason: `No quedan ganchos libres.` };
                targetIdx = found;
            } else {
                if (occupied.includes(targetIdx)) {
                    return { success: false, reason: `El Gancho ${targetIdx + 1} ya está ocupado.` };
                }
            }

            shelf.products.push({
                x: 0,
                hookIndex: targetIdx,
                placedAt: Date.now(),
                layers: [{
                    productId: productId,
                    facings: facings,
                    orientation: 0
                }]
            });
        } else {
            // Plancha
            if (this.gondola.autoPack) {
                if (availableWidth < requiredWidth) {
                    return {
                        success: false,
                        reason: `Sin espacio lineal. \nRequerido: ${requiredWidth}cm \nDisponible: ${availableWidth.toFixed(1)}cm`
                    };
                }

                const newProduct = {
                    x: 0,
                    placedAt: Date.now(),
                    layers: [{
                        productId: productId,
                        facings: facings,
                        orientation: 0
                    }]
                };

                if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= shelf.products.length) {
                    shelf.products.splice(insertIndex, 0, newProduct);
                } else {
                    shelf.products.push(newProduct);
                }
            } else {
                let finalX = targetX !== undefined ? targetX : (this.gondola.shelfWidth - requiredWidth);
                if (finalX < 0) finalX = 0;

                const snapThreshold = 4;
                if (finalX < snapThreshold) {
                    finalX = 0;
                }
                if (this.gondola.shelfWidth - (finalX + requiredWidth) < snapThreshold) {
                    finalX = this.gondola.shelfWidth - requiredWidth;
                }
                shelf.products.forEach(other => {
                    const otherWidth = this.getPlacementWidth(other);
                    const otherLeft = other.x;
                    const otherRight = other.x + otherWidth;

                    if (Math.abs(finalX - otherRight) < snapThreshold) {
                        finalX = otherRight;
                    }
                    if (Math.abs((finalX + requiredWidth) - otherLeft) < snapThreshold) {
                        finalX = otherLeft - requiredWidth;
                    }
                });

                shelf.products.push({
                    x: finalX,
                    placedAt: Date.now(),
                    layers: [{
                        productId: productId,
                        facings: facings,
                        orientation: 0
                    }]
                });
            }
        }

        // Recalculate coordinates first
        this._recalculateShelfX(shelfIndex);

        // Perform validations
        const checkShelf = this.checkShelfCollisions(shelfIndex);
        if (!checkShelf.valid) {
            shelf.products = originalProducts;
            this._recalculateShelfX(shelfIndex);
            return { success: false, reason: checkShelf.reason };
        }

        const globalCheck = this.checkGlobalCollisions();
        if (!globalCheck.valid) {
            shelf.products = originalProducts;
            this._recalculateShelfX(shelfIndex);
            return { success: false, reason: globalCheck.reason };
        }

        this.pushToUndoStack(previousState);
        this._autoSave();
        this.emit('gondola:updated', this.gondola);
        this.emit('dashboard:update');
        return { success: true };
    }

    moveProduct(sourceShelfIndex, sourcePlacementIndex, targetShelfIndex, targetHookIndex = undefined, sourceLayerIndex = undefined, targetX = undefined, insertIndex = undefined) {
        const sourceShelf = this.gondola.shelves[sourceShelfIndex];
        const targetShelf = this.gondola.shelves[targetShelfIndex];
        if (!sourceShelf || !targetShelf) return { success: false, reason: 'Error de estantes' };

        const previousState = JSON.stringify(this.gondola);

        const placement = sourceShelf.products[sourcePlacementIndex];
        if (!placement) return { success: false, reason: 'Producto no encontrado' };

        const originalSourceProducts = JSON.parse(JSON.stringify(sourceShelf.products));
        const originalTargetProducts = JSON.parse(JSON.stringify(targetShelf.products));

        // Get single layer
        let singleLayerToMove = null;
        if (sourceLayerIndex !== undefined && placement.layers && placement.layers.length > 1) {
            singleLayerToMove = placement.layers[sourceLayerIndex];
        }

        let productId = placement.productId;
        let facings = placement.facings || 1;
        let orientation = placement.orientation || 0;
        if (singleLayerToMove) {
            productId = singleLayerToMove.productId;
            facings = singleLayerToMove.facings || 1;
            orientation = singleLayerToMove.orientation || 0;
        } else if (placement.layers && placement.layers.length > 0) {
            productId = placement.layers[0].productId;
            facings = placement.layers[0].facings;
            orientation = placement.layers[0].orientation || 0;
        }

        const dims = this.getPlacedDimensions(productId, orientation);

        if (targetShelf.type === 'perchero') {
            const spacing = targetShelf.hookSpacing || 15;
            const numHooks = Math.floor(this.gondola.shelfWidth / spacing);

            let targetIdx = targetHookIndex;
            const willRemoveSourcePlacement = !singleLayerToMove || (placement.layers && placement.layers.length <= 1);

            const occupied = targetShelf.products
                .filter((p, i) => {
                    if (sourceShelfIndex === targetShelfIndex && i === sourcePlacementIndex) {
                        return !willRemoveSourcePlacement;
                    }
                    return true;
                })
                .map(p => p.hookIndex);

            if (targetIdx === undefined) {
                let found = -1;
                for (let i = 0; i < numHooks; i++) {
                    if (!occupied.includes(i)) {
                        found = i;
                        break;
                    }
                }
                if (found === -1) {
                    return { success: false, reason: `No quedan ganchos libres en este perchero.` };
                }
                targetIdx = found;
            } else {
                if (occupied.includes(targetIdx)) {
                    return { success: false, reason: `El Gancho ${targetIdx + 1} ya está ocupado.` };
                }
            }

            if (singleLayerToMove) {
                placement.layers.splice(sourceLayerIndex, 1);
                if (placement.layers.length === 0) {
                    sourceShelf.products.splice(sourcePlacementIndex, 1);
                }
                targetShelf.products.push({
                    x: 0,
                    hookIndex: targetIdx,
                    placedAt: Date.now(),
                    layers: [singleLayerToMove]
                });
            } else {
                sourceShelf.products.splice(sourcePlacementIndex, 1);
                placement.hookIndex = targetIdx;
                targetShelf.products.push(placement);
            }

        } else {
            const requiredWidth = dims.width * facings;
            const willRemoveSourcePlacement = !singleLayerToMove || (placement.layers && placement.layers.length <= 1);

            if (this.gondola.autoPack) {
                if (singleLayerToMove) {
                    placement.layers.splice(sourceLayerIndex, 1);
                    if (placement.layers.length === 0) {
                        sourceShelf.products.splice(sourcePlacementIndex, 1);
                    }
                    const newPlacement = {
                        x: 0,
                        placedAt: Date.now(),
                        layers: [singleLayerToMove]
                    };
                    if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= targetShelf.products.length) {
                        targetShelf.products.splice(insertIndex, 0, newPlacement);
                    } else {
                        targetShelf.products.push(newPlacement);
                    }
                } else {
                    sourceShelf.products.splice(sourcePlacementIndex, 1);
                    delete placement.hookIndex;
                    if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= targetShelf.products.length) {
                        targetShelf.products.splice(insertIndex, 0, placement);
                    } else {
                        targetShelf.products.push(placement);
                    }
                }
            } else {
                let finalX = targetX !== undefined ? targetX : (this.gondola.shelfWidth - requiredWidth);
                if (finalX < 0) finalX = 0;

                const snapThreshold = 4;
                if (finalX < snapThreshold) {
                    finalX = 0;
                }
                if (this.gondola.shelfWidth - (finalX + requiredWidth) < snapThreshold) {
                    finalX = this.gondola.shelfWidth - requiredWidth;
                }

                targetShelf.products.forEach((other, idx) => {
                    if (sourceShelfIndex === targetShelfIndex && idx === sourcePlacementIndex) return;

                    const otherWidth = this.getPlacementWidth(other);
                    const otherLeft = other.x;
                    const otherRight = other.x + otherWidth;

                    if (Math.abs(finalX - otherRight) < snapThreshold) {
                        finalX = otherRight;
                    }
                    if (Math.abs((finalX + requiredWidth) - otherLeft) < snapThreshold) {
                        finalX = otherLeft - requiredWidth;
                    }
                });

                if (singleLayerToMove) {
                    placement.layers.splice(sourceLayerIndex, 1);
                    if (placement.layers.length === 0) {
                        sourceShelf.products.splice(sourcePlacementIndex, 1);
                    }
                    targetShelf.products.push({
                        x: finalX,
                        placedAt: Date.now(),
                        layers: [singleLayerToMove]
                    });
                } else {
                    sourceShelf.products.splice(sourcePlacementIndex, 1);
                    delete placement.hookIndex;
                    placement.x = finalX;
                    targetShelf.products.push(placement);
                }
            }
        }

        // Recalculate coordinates first
        this._recalculateShelfX(sourceShelfIndex);
        this._recalculateShelfX(targetShelfIndex);

        // Perform validations
        const checkSource = this.checkShelfCollisions(sourceShelfIndex);
        if (!checkSource.valid) {
            sourceShelf.products = originalSourceProducts;
            targetShelf.products = originalTargetProducts;
            this._recalculateShelfX(sourceShelfIndex);
            this._recalculateShelfX(targetShelfIndex);
            return { success: false, reason: checkSource.reason };
        }

        const checkTarget = this.checkShelfCollisions(targetShelfIndex);
        if (!checkTarget.valid) {
            sourceShelf.products = originalSourceProducts;
            targetShelf.products = originalTargetProducts;
            this._recalculateShelfX(sourceShelfIndex);
            this._recalculateShelfX(targetShelfIndex);
            return { success: false, reason: checkTarget.reason };
        }

        const globalCheck = this.checkGlobalCollisions();
        if (!globalCheck.valid) {
            sourceShelf.products = originalSourceProducts;
            targetShelf.products = originalTargetProducts;
            this._recalculateShelfX(sourceShelfIndex);
            this._recalculateShelfX(targetShelfIndex);
            return { success: false, reason: globalCheck.reason };
        }

        this.pushToUndoStack(previousState);
        this._autoSave();
        this.emit('gondola:updated', this.gondola);
        this.emit('dashboard:update');
        return { success: true };
    }

    stackProduct(shelfIndex, placementIndex, newProductId) {
        const shelf = this.gondola.shelves[shelfIndex];
        const p = shelf.products[placementIndex];
        if (!p || !p.layers || p.layers.length === 0) return { success: false, reason: 'Pila inválida' };

        const previousState = JSON.stringify(this.gondola);

        // 1. Calculate total width of base layer
        const baseLayer = p.layers[0];
        const baseDims = this.getPlacedDimensions(baseLayer.productId, baseLayer.orientation || 0);
        const baseTotalWidth = baseDims.width * baseLayer.facings;

        // 2. Calculate dimensions of new product
        const newDims = this.getPlacedDimensions(newProductId, 0);
        if (newDims.width === 0) return { success: false, reason: 'Producto no encontrado' };

        // 3. Determine how many facings of new product fit in baseTotalWidth
        const newFacings = Math.floor(baseTotalWidth / newDims.width);

        if (newFacings < 1) {
            return {
                success: false,
                reason: `El producto es muy ancho para apilarse aquí. \nAncho disponible: ${baseTotalWidth.toFixed(1)}cm \nAncho producto: ${newDims.width}cm`
            };
        }

        // 4. Check total stack height against shelf usable height
        const usableHeight = this.getShelfUsableHeight(shelfIndex);
        let currentStackHeight = 0;
        p.layers.forEach(layer => {
            const layerDims = this.getPlacedDimensions(layer.productId, layer.orientation || 0);
            currentStackHeight += layerDims.height;
        });

        const nextStackHeight = currentStackHeight + newDims.height;

        if (nextStackHeight > usableHeight) {
            return {
                success: false,
                reason: `Sin espacio vertical. \nAltura proyectada: ${nextStackHeight}cm \nEspacio libre: ${usableHeight.toFixed(1)}cm`
            };
        }

        // 5. Add new layer temporarily
        const originalLayers = [...p.layers];
        p.layers.push({
            productId: newProductId,
            facings: newFacings,
            orientation: 0
        });

        // Dry-run check for global vertical collisions!
        const globalCheck = this.checkGlobalCollisions();
        if (!globalCheck.valid) {
            // Revert
            p.layers = originalLayers;
            return {
                success: false,
                reason: globalCheck.reason
            };
        }

        this.pushToUndoStack(previousState);
        this._autoSave();
        this.emit('gondola:updated', this.gondola);
        this.emit('dashboard:update');
        return { success: true };
    }

    removeFromShelf(sIdx, pIdx, lIdx = undefined) {
        const p = this.gondola.shelves[sIdx].products[pIdx];
        if (!p || !p.layers) return;

        const previousState = JSON.stringify(this.gondola);

        if (lIdx === undefined || lIdx === 0) {
            // Remove whole placement if base layer is deleted or no layer specified
            this.gondola.shelves[sIdx].products.splice(pIdx, 1);
        } else {
            // Remove specific layer
            p.layers.splice(lIdx, 1);
        }

        this._recalculateShelfX(sIdx);
        this.pushToUndoStack(previousState);
        this._autoSave();
        this.emit('gondola:updated', this.gondola);
        this.emit('dashboard:update');
    }

    rotateProduct(sIdx, pIdx, lIdx) {
        const shelf = this.gondola.shelves[sIdx];
        if (!shelf) return { success: false, reason: 'Estante no encontrado' };
        const p = shelf.products[pIdx];
        if (!p || !p.layers) return { success: false, reason: 'Producto no encontrado' };
        const layer = p.layers[lIdx];
        if (!layer) return { success: false, reason: 'Capa no encontrada' };

        const previousState = JSON.stringify(this.gondola);

        const originalOrientation = layer.orientation || 0;
        const originalProducts = JSON.parse(JSON.stringify(shelf.products));

        layer.orientation = ((layer.orientation || 0) + 1) % 6;

        if (lIdx > 0) {
            const baseLayer = p.layers[0];
            const baseDims = this.getPlacedDimensions(baseLayer.productId, baseLayer.orientation || 0);
            const baseTotalWidth = baseDims.width * baseLayer.facings;

            const newDims = this.getPlacedDimensions(layer.productId, layer.orientation);
            const newFacings = Math.floor(baseTotalWidth / newDims.width);

            if (newFacings < 1) {
                layer.orientation = originalOrientation;
                return { success: false, reason: 'La rotación hace que la capa exceda el ancho de la base.' };
            }
            layer.facings = newFacings;
        }

        // Height limit check
        const usableHeight = this.getShelfUsableHeight(sIdx);
        let totalHeight = 0;
        p.layers.forEach(l => {
            const dims = this.getPlacedDimensions(l.productId, l.orientation || 0);
            totalHeight += dims.height;
        });
        if (totalHeight > usableHeight) {
            shelf.products = originalProducts;
            this._recalculateShelfX(sIdx);
            return { success: false, reason: `La rotación hace que el producto sea muy alto (${totalHeight}cm) para el espacio libre (${usableHeight.toFixed(1)}cm).` };
        }

        this._recalculateShelfX(sIdx);

        // Perform validations
        const checkShelf = this.checkShelfCollisions(sIdx);
        if (!checkShelf.valid) {
            shelf.products = originalProducts;
            this._recalculateShelfX(sIdx);
            return { success: false, reason: checkShelf.reason };
        }

        const globalCheck = this.checkGlobalCollisions();
        if (!globalCheck.valid) {
            shelf.products = originalProducts;
            this._recalculateShelfX(sIdx);
            return { success: false, reason: globalCheck.reason };
        }

        this.pushToUndoStack(previousState);
        this._autoSave();
        this.emit('gondola:updated', this.gondola);
        this.emit('dashboard:update');
        return { success: true };
    }

    updateProductFacings(sIdx, pIdx, lIdx, newFacings) {
        const shelf = this.gondola.shelves[sIdx];
        if (!shelf) return { success: false, reason: 'Estante no encontrado' };
        const p = shelf.products[pIdx];
        if (!p || !p.layers) return { success: false, reason: 'Producto no encontrado' };
        const layer = p.layers[lIdx];
        if (!layer) return { success: false, reason: 'Capa no encontrada' };

        const previousState = JSON.stringify(this.gondola);

        const originalProducts = JSON.parse(JSON.stringify(shelf.products));

        const dims = this.getPlacedDimensions(layer.productId, layer.orientation || 0);

        const oldWidth = dims.width * layer.facings;
        const newWidth = dims.width * newFacings;

        layer.facings = newFacings;

        if (lIdx === 0) {
            for (let i = 1; i < p.layers.length; i++) {
                const uLayer = p.layers[i];
                const uDims = this.getPlacedDimensions(uLayer.productId, uLayer.orientation || 0);
                const maxF = Math.floor(newWidth / uDims.width);
                uLayer.facings = Math.max(1, maxF);
            }
        }

        this._recalculateShelfX(sIdx);

        // Perform validations
        const checkShelf = this.checkShelfCollisions(sIdx);
        if (!checkShelf.valid) {
            shelf.products = originalProducts;
            this._recalculateShelfX(sIdx);
            return { success: false, reason: checkShelf.reason };
        }

        const globalCheck = this.checkGlobalCollisions();
        if (!globalCheck.valid) {
            shelf.products = originalProducts;
            this._recalculateShelfX(sIdx);
            return { success: false, reason: globalCheck.reason };
        }

        this.pushToUndoStack(previousState);
        this._autoSave();
        this.emit('gondola:updated', this.gondola);
        this.emit('dashboard:update');
        return { success: true };
    }
}
