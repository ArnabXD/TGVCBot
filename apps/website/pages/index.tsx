import type { NextPage } from 'next';

const Home: NextPage = () => {
  return (
    <div>
      <div className="bg-gradient-to-br from-rose-700 to-pink-600 text-white">
        <div className="flex flex-1 items-center mx-auto max-w-screen-xl px-3 py-12 md:p-6 min-h-[20vh] md:min-h-[50vh]">
          <div className="">
            <h1 className="text-5xl md:text-6xl font-semibold">TGVCBot</h1>
            <p className="text-xl my-1 font-medium">
              Stream Music on Telegram Video Chat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
