import { LandingView } from '@/components/LandingView.tsx';

/**
 * Static, deliberately.
 *
 * Reading the session here to relabel the button would make the highest-traffic
 * page server-rendered on demand, which is a poor trade for a landing page.
 * Instead the call to action always points at `/login`, and `/login` sends an
 * already-signed-in visitor straight on to `/languages`. Same destination, one
 * redirect, no dynamic render and no label flicker.
 */
export default function Page() {
  return <LandingView />;
}
