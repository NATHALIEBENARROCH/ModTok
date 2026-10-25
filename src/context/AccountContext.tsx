import { createContext, useContext } from 'react';

// isGuest is true when someone chose "Try it without an account" on the sign-in screen.
// Guests get a private (anonymous) profile so their wardrobe and outfits are saved, and
// they can turn it into a full account later without losing anything.
type AccountContextType = { isGuest: boolean };

const AccountContext = createContext<AccountContextType>({ isGuest: false });

export const AccountProvider = AccountContext.Provider;

export function useAccount() {
  return useContext(AccountContext);
}
