// src/pages/index.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { faImage, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Slider from "@mui/material/Slider";
import "react-datepicker/dist/react-datepicker.css";
import toast, { Toaster } from "react-hot-toast";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import externalContracts from "~~/contracts/externalContracts";
import { pieChartData } from "~~/utils/data";

interface CheckboxOption {
  name: string;
  value: string;
}

interface TransactionStatusProps {
  hash?: string;
  isConfirming: boolean;
  isConfirmed: boolean;
}

const TransactionStatus = ({ hash, isConfirming, isConfirmed }: TransactionStatusProps) => {
  const [toggleFlag, setToggleFlag] = useState(false);
  
  useEffect(() => {
    if (!toggleFlag) {
      setToggleFlag(true);
      return;
    }

    if (isConfirming && !isConfirmed) {
      toast.loading("Waiting for confirmation...");
    }
    if (isConfirmed) {
      toast.dismiss();
      toast.success("Transaction confirmed.");
    }
  }, [hash, isConfirming, isConfirmed]);

  return (
    <div>
      <Toaster />
    </div>
  );
};

const Home = () => {
  const { chain, address } = useAccount();
  const { data: hash, error, writeContract } = useWriteContract();
  
  const [adName, setAdName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [userType, setUserType] = useState<string>("advertiser");
  const [week, setWeek] = useState<number>(1);

  const router = useRouter();
  const searchParams = useSearchParams();

  const handleToggle = (type: string) => {
    refreshParameters();
    router.push(`/?tab=${type === "user" ? "users" : "advertiser"}`);
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "users") {
      setUserType("user");
    } else if (tab === "advertiser") {
      setUserType("advertiser");
    }
  }, [searchParams]);

  const refreshParameters = () => {
    setAdName("");
    setDescription("");
    setWeek(1);
    setSelectedCheckboxesAdvertiser(new Array(checkboxOptions.length).fill(false));
    setSelectedCheckboxesUser(new Array(checkboxOptions.length).fill(false));
    toast.remove();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleSubmitCreateProfile = () => {
    if (!chain || !chain.id) {
      return;
    }

    const contract = externalContracts[8008135].AdMatcher;
    writeContract({
      address: contract.address,
      functionName: "addUserVector",
      args: [selectedCheckboxesUser],
      abi: contract.abi,
    });
  };

  const handleSubmitAdvertiser = () => {
    if (!chain || !chain.id) {
      return;
    }

    const contract = externalContracts[534351].AdContract;

    try {
      writeContract({
        address: contract.address,
        functionName: "createAd",
        args: [
          adName,
          description,
          BigInt(week),
          selectedCheckboxesAdvertiser as [boolean, boolean, boolean, boolean, boolean],
          "0xEFB2A0589CEC7E3aB17Dd00b44C820C66FCf0BBc",
        ],
        abi: contract.abi,
      });
    } catch (error) {
      console.error("Error creating ad:", error);
    }
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const checkboxOptions: CheckboxOption[] = pieChartData.map(data => {
    return { name: data, value: data };
  });

  const [selectedCheckboxesAdvertiser, setSelectedCheckboxesAdvertiser] = useState<boolean[]>(
    new Array(checkboxOptions.length).fill(false),
  );

  const [selectedCheckboxesUser, setSelectedCheckboxesUser] = useState<boolean[]>(
    new Array(checkboxOptions.length).fill(false),
  );

  const handleCheckboxChangeAdvertiser = (option: CheckboxOption) => {
    const index = checkboxOptions.findIndex(item => item.value === option.value);
    const newCheckboxes = [...selectedCheckboxesAdvertiser];
    newCheckboxes[index] = !newCheckboxes[index];
    setSelectedCheckboxesAdvertiser(newCheckboxes);
  };

  const handleCheckboxChangeUser = (option: CheckboxOption) => {
    const index = checkboxOptions.findIndex(item => item.value === option.value);
    const newCheckboxes = [...selectedCheckboxesUser];
    newCheckboxes[index] = !newCheckboxes[index];
    setSelectedCheckboxesUser(newCheckboxes);
  };

  const { data: userVector } = useReadContract({
    address: externalContracts[8008135].AdMatcher.address,
    functionName: "getUserVector",
    args: [address || "0x"],
    abi: externalContracts[8008135].AdMatcher.abi,
  });

  useEffect(() => {
    if (userVector && userVector.length > 0 && userVector[0] != null) {
      setSelectedCheckboxesUser(userVector as boolean[]);
    }
  }, [userVector]);

  return (
    <div className="flex flex-col items-center gap-4 pt-12">
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold bg-custom-gradient bg-clip-text text-transparent">AdFHEnture</h1>
      </div>
      <div>
        <button
          onClick={() => handleToggle("advertiser")}
          className={`w-[225px] h-[40px] rounded-l-lg transition-all duration-700 ease-in-out ${
            userType === "user" ? "text-white text-xl bg-[#262626]" : "text-black text-xl bg-custom-gradient"
          } `}
        >
          For Advertisers
        </button>
        <button
          onClick={() => handleToggle("user")}
          className={`w-[225px] h-[40px] rounded-r-lg transition-all duration-700 ease-in-out ${
            userType === "advertiser" ? "text-white text-xl bg-[#262626]" : "text-black text-xl bg-custom-gradient"
          } `}
        >
          For Users
        </button>
      </div>
      {userType === "advertiser" ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 lg:w-3/5 md:w-4/5 w-full justify-center items-center"
        >
          <div className="flex flex-col w-full justify-center items-center">
            <div className="flex flex-col justify-center  w-1/2 mx-2 rounded px-4 relative">
              <span className="text-2xl text-center my-2">Publish new Ad</span>
              <div className="flex flex-col mb-4">
                <div className="flex items-center border border-gray-300 rounded-lg bg-white px-4 py-2">
                  <label className="text-gray-700">Ad Name:</label>
                  <input
                    type="text"
                    className="ml-2 w-full px-2 py-1 border border-gray-300 rounded"
                    value={adName}
                    onChange={(e) => setAdName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col mb-4">
                <div className="flex items-center border border-gray-300 rounded-lg bg-white px-4 py-2">
                  <label className="text-gray-700">Description:</label>
                  <textarea
                    className="ml-2 w-full px-2 py-1 border border-gray-300 rounded"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col mb-4">
                <div className="flex items-center border border-gray-300 rounded-lg bg-white px-4 py-2">
                  <label className="text-gray-700">Week:</label>
                  <Slider
                    min={1}
                    max={4}
                    step={1}
                    value={week}
                    onChange={(e, newValue) => setWeek(newValue as number)}
                    valueLabelDisplay="auto"
                    aria-labelledby="week-slider"
                    className="ml-2"
                  />
                </div>
              </div>
              <div className="flex flex-col mb-4">
                <div className="flex flex-wrap gap-2">
                  {checkboxOptions.map((option, index) => (
                    <div key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedCheckboxesAdvertiser[index]}
                        onChange={() => handleCheckboxChangeAdvertiser(option)}
                        className="mr-2"
                      />
                      <label className="text-gray-700">{option.name}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  type="submit"
                  onClick={handleSubmitAdvertiser}
                  className="w-1/3 bg-custom-gradient rounded-lg py-2 text-white font-bold"
                >
                  Create Ad
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 lg:w-3/5 md:w-4/5 w-full justify-center items-center"
        >
          <div className="flex flex-col w-full justify-center items-center">
            <div className="flex flex-col justify-center  w-1/2 mx-2 rounded px-4 relative">
              <span className="text-2xl text-center my-2">Update User Preferences</span>
              <div className="flex flex-col mb-4">
                <div className="flex flex-wrap gap-2">
                  {checkboxOptions.map((option, index) => (
                    <div key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedCheckboxesUser[index]}
                        onChange={() => handleCheckboxChangeUser(option)}
                        className="mr-2"
                      />
                      <label className="text-gray-700">{option.name}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  type="submit"
                  onClick={handleSubmitCreateProfile}
                  className="w-1/3 bg-custom-gradient rounded-lg py-2 text-white font-bold"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
      <TransactionStatus hash={hash} isConfirming={isConfirming} isConfirmed={isConfirmed} />
    </div>
  );
};

export default Home;
