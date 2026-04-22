import { createContext, useContext, useState, ReactNode } from "react";
import type { Role } from "@/lib/mock-data";

interface RoleCtx {
  role: Role;
  setRole: (r: Role) => void;
}
const Ctx = createContext<RoleCtx>({ role: "field", setRole: () => {} });

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<Role>("field");
  return <Ctx.Provider value={{ role, setRole }}>{children}</Ctx.Provider>;
};

export const useRole = () => useContext(Ctx);
