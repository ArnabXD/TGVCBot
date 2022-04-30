import type { NextPage } from 'next';

const Home: NextPage = () => {
  return (
    <div>
      <div className="bg-gradient-to-br from-sky-400 to-cyan-300 text-white">
        <div className="flex flex-1 items-center mx-auto max-w-screen-xl px-3 py-12 md:p-6 min-h-[20vh] md:min-h-[50vh]">
          <div className="">
            <h1 className="text-5xl md:text-6xl font-semibold drop-shadow-lg">
              TGVCBot
            </h1>
            <p className="text-xl my-1 font-medium drop-shadow-md">
              Stream Music on Telegram Video Chat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
