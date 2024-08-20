"use client";

import { useEffect, useState } from "react";
import { PieChart } from "@mui/x-charts";
import "react-datepicker/dist/react-datepicker.css";
import { getAdvertiser } from "~~/api";
import { pieChartData } from "~~/utils/data";

const AdCard = (props: { imageUrl: string; websiteUrl: string }) => {
  const { imageUrl, websiteUrl } = props;
  return (
    <a className="text-center rounded-lg shadow-xl" href={websiteUrl} target="_blank" rel="noreferrer">
      <img src={imageUrl} alt="image" className="w-full h-full relative" />
    </a>
  );
};

const Advertiser = ({ params }: { params: { walletId: string } }) => {
  const [paidValue, setPaidValue] = useState(100);

  const [interestsData, setInterestsData] = useState([0, 0, 0, 0, 0]);
  const [ads, setAds] = useState([]);

  useEffect(() => {
    const fetchAdvertiser = async () => {
      try {
        const advertiserData = await getAdvertiser(params.walletId);
        setInterestsData(advertiserData.interests);
        setPaidValue(advertiserData.totalPaid);
        setAds(advertiserData.ads);
      } catch (err) {
      } finally {
      }
    };

    fetchAdvertiser();
  }, [params.walletId]);

  const returnInterestData = (arr: any[]): { id: number; value: number; label: string }[] => {
    let totalValue = 0;
    arr.forEach(element => {
      totalValue += +element;
    });

    return arr
      .map((data, i) => {
        if (+data > 0) {
          return { id: i, value: parseFloat(((+data / totalValue) * 100).toFixed(2)), label: pieChartData[i] };
        }
        return null; // Explicitly return null for non-matching cases
      })
      .filter((d): d is { id: number; value: number; label: string } => d !== null);
  };

  return (
    <div className="flex flex-col items-center gap-0 py-12 w-full">
      <div className="flex flex-col items-center justify-center w-full relative">
        <h1 className="text-4xl font-bold bg-custom-gradient bg-clip-text text-transparent">
          {params.walletId ? `${params.walletId.slice(0, 4)}....${params.walletId.slice(-4)}` : "ADVERTISER"}
        </h1>
        <span className="w-[200px] p-4 m-4 text-white border-white border-2 bg-[#262626] text-center rounded text-2xl">
          Paid: {paidValue}$
        </span>
        <div className="flex flex-row">
          <PieChart
            series={[
              {
                data: interestsData ? returnInterestData(interestsData) : [],
                innerRadius: 30,
                cornerRadius: 10,
                paddingAngle: 2,
                highlightScope: { faded: "global", highlighted: "item" },
                faded: { innerRadius: 10, additionalRadius: -10, color: "gray" },
                arcLabel: item => `${item.label} (${item.value}%)`,
                arcLabelMinAngle: 45,
              },
            ]}
            slotProps={{ legend: { hidden: true } }}
            width={800}
            height={500}
            colors={["#E7F3C6"]}
          />
          <div className="grid grid-cols-2 justify-items-center items-center">
            {ads &&
              ads.map((ad: { imageUrl: string; websiteUrl: string }, i) => {
                return (
                  <span key={i} className="w-[120px] h-[80px] mx-4 relative border-2 border-white rounded">
                    <AdCard imageUrl={ad.imageUrl} websiteUrl={ad.websiteUrl || ""} />
                  </span>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Advertiser;
