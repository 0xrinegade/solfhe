"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import "react-datepicker/dist/react-datepicker.css";
import { useAccount, useReadContract } from "wagmi";
import { getAdByAdId } from "~~/api";
import externalContracts from "~~/contracts/externalContracts";

const AdCard = (props: { imageUrl: string; websiteUrl: string; wallet: string }) => {
  const { imageUrl, websiteUrl, wallet } = props;
  return (
    <a
      className="w-[400px] h-[90px] text-center rounded-lg p-2 m-2 absolute bottom-4 left-4 shadow-xl"
      href={websiteUrl}
      target="_blank"
      rel="noreferrer"
    >
      <div
        className={`absolute inset-0 rounded-lg bg-cover bg-center opacity-100`}
        style={{ backgroundImage: `url(${imageUrl})` }}
      ></div>
      <div className="absolute inset-0 rounded-lg bg-black opacity-30"></div>
      <div className="relative z-10">
        <div className="absolute left-0 top-0 border w-[36px] h-[20px] rounded text-center text-xs text-white">Ad</div>
        <Link
          href={`/advertiser/${wallet}`}
          className="absolute right-0 top-0 border w-[64px] h-[20px] rounded text-center text-xs text-white"
        >
          Advertisor
        </Link>
      </div>
    </a>
  );
};

const Ads = ({ params }: { params: { link: string } }) => {
  const searchParams = useSearchParams();
  const encodedLink = params.link;
  const { address } = useAccount();
  const [decodedLink, setDecodedLink] = useState<string | null>(null);
  const [ad, setAd] = useState<{ imageUrl: string; websiteUrl: string; advertiser: { wallet: string } } | null>(null);

  const {
    data: bestAd,
    error,
    isFetched,
  } = useReadContract({
    address: externalContracts[8008135].AdMatcher.address,
    functionName: "findBestAdPermitSealedFromSenderAddressWithoutPermit",
    args: [address || "0x"],
    abi: externalContracts[8008135].AdMatcher.abi,
  });

  console.log("best ad ", bestAd);
  console.log("best ad error ", error);

  useEffect(() => {
    if (encodedLink) {
      const fullLink = decodeURIComponent(encodedLink);
      const fullUrl = `${fullLink}${searchParams ? `?${searchParams.toString()}` : ""}`.replaceAll(",", "/");
      setDecodedLink(fullUrl);
    }
  }, [encodedLink, searchParams]);

  useEffect(() => {
    if (isFetched) {
      getAdByAdId(bestAd?.toString() || "0").then(ad => {
        setAd(ad);
      });
    }
  }, [isFetched]);

  if (!decodedLink) {
    return <div>...Loading</div>;
  }

  return (
    <div className="flex flex-col items-center h-screen gap-0 py-0 w-full">
      <div className="flex flex-col items-center justify-center w-full relative">
        {ad && <AdCard imageUrl={ad.imageUrl} websiteUrl={ad.websiteUrl || ""} wallet={ad.advertiser?.wallet} />}
        <div className="w-full">
          <iframe
            src={`https://${decodedLink}`}
            width="100%"
            height="850px"
            style={{ border: "none" }}
            title={"site"}
          />
        </div>
      </div>
    </div>
  );
};

export default Ads;
