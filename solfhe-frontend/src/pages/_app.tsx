import "../styles/globals.css";
import type { AppProps } from "next/app";
import WalletConnection from "../components/WalletConnection";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WalletConnection>
      <Component {...pageProps} />
    </WalletConnection>
  );
}

export default MyApp;
