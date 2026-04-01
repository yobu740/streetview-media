import { createContext, useContext, useState } from "react";

interface MobileNavContextType {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const MobileNavContext = createContext<MobileNavContextType>({
  isMobileOpen: false,
  setIsMobileOpen: () => {},
});

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  return (
    <MobileNavContext.Provider value={{ isMobileOpen, setIsMobileOpen }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export const useMobileNav = () => useContext(MobileNavContext);
