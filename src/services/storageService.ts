import { Asset, Budget, Liability, NetWorthSnapshot } from '../../types';

const APP_DATA_KEY = 'budget-tracker-app-data';
const SETTINGS_KEY = 'budget-tracker-settings';
const LEGACY_BUDGETS_KEY = 'budget-tracker-data';
const LEGACY_ACTIVE_ID_KEY = 'budget-tracker-active-id';
const CURRENT_DATA_VERSION = 1;

export interface AppDataPayload {
  budgets: Budget[];
  activeBudgetId: string | null;
  assets: Asset[];
  liabilities: Liability[];
  netWorthHistory: NetWorthSnapshot[];
}

interface PersistedAppData extends AppDataPayload {
  version?: number;
  updatedAt?: string;
  investmentAccounts?: Asset[];
}

interface LegacyBudgetData {
  budgets: Budget[];
  activeBudgetId: string | null;
}

export const loadAppData = (): PersistedAppData | null => {
  try {
    const raw = localStorage.getItem(APP_DATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedAppData;
  } catch (error) {
    console.error('Failed to load app data from localStorage', error);
    return null;
  }
};

export const saveAppData = (data: AppDataPayload): void => {
  try {
    const dataToSave: PersistedAppData = {
      ...data,
      version: CURRENT_DATA_VERSION,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(APP_DATA_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.error('Failed to save app data to localStorage', error);
  }
};

export const loadLegacyBudgetData = (): LegacyBudgetData | null => {
  try {
    const savedBudgets = localStorage.getItem(LEGACY_BUDGETS_KEY);
    const savedActiveId = localStorage.getItem(LEGACY_ACTIVE_ID_KEY);
    if (!savedBudgets) return null;
    return {
      budgets: JSON.parse(savedBudgets) as Budget[],
      activeBudgetId: savedActiveId,
    };
  } catch (error) {
    console.error('Failed to load legacy budget data', error);
    return null;
  }
};

export const clearLegacyBudgetData = (): void => {
  localStorage.removeItem(LEGACY_BUDGETS_KEY);
  localStorage.removeItem(LEGACY_ACTIVE_ID_KEY);
};

export const loadSettings = <T extends object>(): T | null => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('Failed to load settings from localStorage', error);
    return null;
  }
};

export const saveSettings = <T extends object>(settings: T): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings to localStorage', error);
  }
};
