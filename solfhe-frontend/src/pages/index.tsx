import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>SolFHE - FHE-based Secure Advertising on Solana</title>
        <meta
          name="description"
          content="FHE-based personalized advertising on Solana"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>Welcome to SolFHE</h1>
        <nav>
          <Link href="/create-ad">
            <a>Create Ad</a>
          </Link>
          <Link href="/match-ads">
            <a>Match Ads</a>
          </Link>
          <Link href="/user-data">
            <a>Manage User Data</a>
          </Link>
        </nav>
      </main>
    </div>
  );
};

export default Home;
