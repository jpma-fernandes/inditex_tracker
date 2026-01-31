// ============================================
// Database Storage - Re-exports all CRUD operations
// ============================================

// Products
export {
    getProducts,
    getProductById,
    getProductByUrl,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductFolders,
    toProduct,
} from './products';

// Folders
export {
    getFolders,
    getFolderById,
    getFolderWithProducts,
    createFolder,
    updateFolder,
    deleteFolder,
    addProductsToFolder,
    removeProductFromFolder,
    type Folder,
} from './folders';

// Price History
export {
    getPriceHistory,
    addPriceHistory,
    getAllPriceHistory,
} from './price-history';

// Stock Snapshots
export {
    getStockSnapshots,
    getLatestStockSnapshot,
    addStockSnapshot,
    getAllStockSnapshots,
    getStockHistoryBySize,
    type StockSnapshot,
} from './stock-snapshots';

// Utils
export {
    clearAllData,
    exportData,
} from './utils';
