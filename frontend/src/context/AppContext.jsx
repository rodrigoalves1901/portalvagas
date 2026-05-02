import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [firecrawlKey, setFirecrawlKey] = useState(() => {
    return localStorage.getItem('firecrawl_key') || '';
  });

  useEffect(() => {
    if (firecrawlKey) {
      localStorage.setItem('firecrawl_key', firecrawlKey);
    } else {
      localStorage.removeItem('firecrawl_key');
    }
  }, [firecrawlKey]);

  return (
    <AppContext.Provider value={{ user, setUser, firecrawlKey, setFirecrawlKey }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
