"use client";

import Link from "next/link";

interface WebsiteCardProps {
  name: string;
  url: string;
  imgSrc: string;
}

const WebsiteCard: React.FC<WebsiteCardProps> = ({ name, url, imgSrc }) => {
  return (
    <Link
      href={`/ads/${url}`}
      className="relative flex flex-row justify-center items-start w-[400px] h-[150px] border-2 border-white rounded p-4 m-4 overflow-hidden"
    >
      <img
        className="absolute left-0 top-0 w-full h-full object-cover opacity-70 transition-transform duration-700 ease-in-out hover:scale-110 z-0"
        src={imgSrc}
        alt=""
      />
      <span className="absolute left-2 top-1 text-2xl bg-custom-gradient bg-clip-text text-transparent font-bold pointer-events-none">
        {name}
      </span>
    </Link>
  );
};

const Websites = () => {
  const websiteList = [
    {
      name: "Scroll",
      url: "scroll.io",
      imgSrc: "https://mms.businesswire.com/media/20231017097939/en/1916843/23/fulllogo.jpg",
    },
    {
      name: "Fhenix",
      url: "www.docs.fhenix.zone",
      imgSrc: "https://cryptodaily.blob.core.windows.net/space/fhenix%201920%20X%201080.jpg",
    },
    {
      name: "The Graph",
      url: "thegraph.com",
      imgSrc: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSnHGufpCE24KXqYENnOjhp4Fcf9PvDM3kZDA&s",
    },
    {
      name: "Metamask",
      url: "metamask.io",
      imgSrc: "https://nftnow.com/wp-content/uploads/2021/10/Metamask-How-To-Asset.png",
    },
    {
      name: "Zircuit",
      url: "stake.zircuit.com/",
      imgSrc: "https://www.blockleaders.io/.image/t_share/MjA0NTY3NDczMzg5ODM5Njc1/image-placeholder-title.jpg",
    },
    {
      name: "Dynamics",
      url: "docs.dynamic.xyz",
      imgSrc:
        "https://res.cloudinary.com/practicaldev/image/fetch/s--is0RUpX5--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_800/https://www.proof2work.com/_next/image%3Furl%3Dhttps%253A%252F%252Fcdn.sanity.io%252Fimages%252Fmre6fyj5%252Fproduction%252F7bb1e0aab117324f8edaebf0afe12109ac039665-600x395.jpg%26w%3D828%26q%3D75",
    },
  ];

  return (
    <div className="flex flex-col items-center gap-0 py-12 w-full">
      <div className="flex flex-col items-center justify-center w-full relative">
        <h1 className="text-4xl font-bold bg-custom-gradient bg-clip-text text-transparent">WEBSITES</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 w-full items-center justify-items-center px-16">
          {websiteList.map(site => (
            <WebsiteCard name={site.name} url={site.url} imgSrc={site.imgSrc} key={site.name} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Websites;
