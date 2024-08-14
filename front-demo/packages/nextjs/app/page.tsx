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

const TransactionStatus = ({ hash, isConfirming, isConfirmed }) => {
  const [toggleFlag, setToggleFlag] = useState(false);
  useEffect(() => {
    if (!toggleFlag) {
      setToggleFlag(true);
      return;
    }
    //   if (hash) {
    //     toast.success(`Transaction Hash: ${hash}`);
    //   }

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

  const [adName, setAdName] = useState("");
  const [description, setDescription] = useState("");
  const [userType, setUserType] = useState("advertiser");
  const [week, setWeek] = useState(1);

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
        {/* <Image priority src={logo} alt="" /> */}
        <h1 className="text-4xl font-bold bg-custom-gradient bg-clip-text text-transparent">AdFHEnture</h1>
        {/* <h2 className="text-xl text-white text-center">
          Neque porro quisquam est qui <br /> dolorem
        </h2> */}
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
                <div className="flex items-center border border-gray-300 rounded-lg bg-[#262626] p-2 w-full">
                  <FontAwesomeIcon icon={faUser} className="text-[#6F7482] mr-2" />
                  <input
                    type="text"
                    placeholder="Website URL"
                    value={adName}
                    onChange={e => setAdName(e.target.value)}
                    className="p-2 bg-[#262626] text-[#6F7482] w-full border-none outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center border border-gray-300 rounded-lg bg-[#262626] p-2 w-full">
                <FontAwesomeIcon icon={faImage} className="text-[#6F7482] mr-2" />
                <input
                  type="text"
                  value={description}
                  placeholder="Image URL"
                  onChange={e => setDescription(e.target.value)}
                  className="p-2 bg-[#262626] text-[#6F7482] w-full border-none outline-none"
                />
              </div>
              <div className="flex flex-col w-full mt-4">
                <div className="w-full flex flex-row justify-between items-center mt-6">
                  <span className="text-xl">Expiry Date</span>
                  <span className="text-xl text-center w-20">{week} week</span>
                </div>
                <Slider
                  aria-label="Date"
                  defaultValue={1}
                  onChange={(event: Event, value: number | number[]) => {
                    setWeek(value as number);
                  }}
                  valueLabelDisplay="auto"
                  shiftStep={1}
                  step={1}
                  marks
                  min={0}
                  max={6}
                  sx={{
                    color: "#E7F3C6", // Ana renk
                    "& .MuiSlider-thumb": {
                      backgroundColor: "#262626", // Thumb rengi
                    },
                    "& .MuiSlider-track": {
                      backgroundColor: "#262626", // Track rengi
                    },
                    "& .MuiSlider-rail": {
                      backgroundColor: "#E7F3C6", // Rail rengi
                    },
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col justify-center items-center w-3/4 mx-2 rounded p-2 relative">
              <span className="text-2xl text-center mb-4 mt-2">Target Audience</span>
              <div className="grid grid-cols-2">
                {checkboxOptions.map((option, index) => (
                  <div key={index} className="flex justify-start items-center rounded-lg px-8 my-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id={`checkbox-${index}`}
                      name={option.name}
                      value={option.value}
                      checked={selectedCheckboxesAdvertiser[index]}
                      onChange={e => {
                        e.stopPropagation();
                        handleCheckboxChangeAdvertiser(option);
                      }}
                      className="w-[16px] h-[16px] text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 accent-[#E7F3C6]"
                    />

                    <label htmlFor={`checkbox-${index}`} className="text-[#6F7482] text-lg pl-4">
                      {option.value}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="w-[250px] h-[50px] text-black text-xl bg-custom-gradient transition-all duration-300 hover:scale-110 mb-4 rounded"
            onClick={handleSubmitAdvertiser}
          >
            Pay & Submit
          </button>
          {/* {hash && <div>Transaction Hash: {hash}</div>}
          {isConfirming && <div>Waiting for confirmation...</div>}
          {isConfirmed && <div>Transaction confirmed.</div>} */}
          <TransactionStatus hash={hash} isConfirming={isConfirming} isConfirmed={isConfirmed} />
          {error && (
            <div>
              Error: {error.message} {error.name}
            </div>
          )}
        </form>
      ) : (
        <div className="flex flex-col justify-start items-center w-full h-full mx-2 rounded p-4 relative">
          <span className="text-4xl text-center mb-8">Create Profile</span>
          <div className="grid grid-cols-2 w-1/3">
            {checkboxOptions.map((option, index) => (
              <div key={index} className="flex justify-start items-center rounded-lg pr-6 pl-8 my-2 cursor-pointer">
                <input
                  type="checkbox"
                  id={`checkbox-${index}`}
                  name={option.name}
                  value={option.value}
                  checked={selectedCheckboxesUser[index]}
                  onChange={e => {
                    e.stopPropagation();
                    handleCheckboxChangeUser(option);
                  }}
                  className="w-[16px] h-[16px] text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 accent-[#E7F3C6]"
                />

                <label htmlFor={`checkbox-${index}`} className="text-[#6F7482] text-lg pl-4">
                  {option.value}
                </label>
              </div>
            ))}
          </div>
          <button
            type="submit"
            className="w-[250px] h-[50px] text-black text-xl bg-custom-gradient mt-8 transition-all duration-300 hover:scale-110 rounded"
            onClick={handleSubmitCreateProfile}
          >
            Submit
          </button>
          {/* {hash && <div>Transaction Hash: {hash}</div>}
          {isConfirming && <div>Waiting for confirmation...</div>}
          {isConfirmed && <div>Transaction confirmed.</div>} */}
          {error && <div>Error: {error.message}</div>}
          <TransactionStatus hash={hash} isConfirming={isConfirming} isConfirmed={isConfirmed} />
        </div>
      )}
    </div>
  );
};

export default Home;
