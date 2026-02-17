/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useRef } from "react";
import { MusicalNoteIcon } from "@heroicons/react/24/solid";
import { StarIcon } from "@heroicons/react/24/outline";
import {
  FaChevronLeft,
  FaChevronRight,
  FaForward,
  FaBackward,
  FaPlay,
  FaVolumeUp,
  FaSearch,
  FaTrashAlt,
  FaVolumeMute,
} from "react-icons/fa";
import { FaPause, FaShuffle } from "react-icons/fa6";
import { v4 } from "uuid";
import MarqueeBg from "@/ui/backgrounds/marquee-bg";
import clsx from "clsx";
import MarqueeText from "@/ui/global/marquee-text";
import YouTube, { YouTubeProps } from "react-youtube";
import { PiRepeat, PiRepeatBold, PiRepeatOnceBold } from "react-icons/pi";
import { createClient } from "@/utils/supabase/client";
import { setLocalStorage } from "@/ui/settings-manager";
import { PrimaryButton } from "@/ui/global/buttons";
import { AnimatePresence, motion } from "motion/react";

// Standard song type
interface YTMusicResult {
  name: string;
  artist: { artistId: string; name: string };
  duration: number;
  thumbnails: { height: number; width: number; url: string }[];
  videoId: string;
  id: string;
}

export default function Page() {
  // Stateful values
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<YTMusicResult[] | null>(
    null
  );
  const [queue, setQueue] = useState<YTMusicResult[] | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<null | number>(
    null
  );
  const [playerState, setPlayerState] = useState<number | null>(null);
  const [repeating, setRepeating] = useState<true | false | 1>(false);
  const [muted, setMuted] = useState(false);
  const [starredSongs, setStarredSongs] = useState<YTMusicResult[] | []>([]);
  const [sideMenuPage, setSideMenuPage] = useState<"queue" | "starredSongs">(
    "queue"
  );
  const [currentTime, setCurrentTime] = useState(0);

  // The YouTube Player
  const playerRef = useRef<YT.Player | null>(null);

  // Supabase client
  const supabase = createClient();

  // Util functions
  async function getSearchResults(query: string | null) {
    if (query == null) return;

    const res = await fetch(
      `/api/ytmusic/search?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) {
      throw new Error("Failed to fetch search results");
    }

    const data = await res.json();

    return data;
  }

  function formatTime(seconds: number) {
    if (seconds < 0) {
      seconds = 0;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${secs}`;
  }

  function pauseSong() {
    playerRef.current?.pauseVideo();
  }

  function resumeSong() {
    playerRef.current?.playVideo();
  }

  // Shuffle array but keep the item at fixedIndex in the same place

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function shuffleKeepIndex(arr: any[], fixedIndex: number) {
    const result = [...arr];

    const fixedValue = result[fixedIndex];

    const rest = result.filter((_, i) => i !== fixedIndex);

    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }

    let ri = 0;
    for (let i = 0; i < result.length; i++) {
      if (i === fixedIndex) {
        result[i] = fixedValue;
      } else {
        result[i] = rest[ri++];
      }
    }

    return result;
  }

  function shuffleQueue() {
    setQueue(shuffleKeepIndex(queue ?? [], currentTrackIndex ?? 0));
  }

  // Seek controls

  function seekBackwards10() {
    playerRef.current?.seekTo(playerRef.current.getCurrentTime() - 10, true);
  }

  function seekBackwards5() {
    playerRef.current?.seekTo(playerRef.current.getCurrentTime() - 5, true);
  }

  function seekForwards5() {
    const currentTime = playerRef.current?.getCurrentTime() ?? 0;
    playerRef.current?.seekTo(currentTime + 5, true);

    if (currentTrackIndex == null) {
      return;
    }

    if (currentTime + 5 >= (queue?.[currentTrackIndex]?.duration ?? 0)) {
      if (
        currentTrackIndex != null &&
        queue &&
        queue.length > currentTrackIndex
      ) {
        if (repeating === false) {
          setCurrentTrackIndex(currentTrackIndex + 1);
        } else if (
          repeating === true &&
          currentTrackIndex == queue.length - 1
        ) {
          setCurrentTrackIndex(0);
          playerRef.current?.seekTo(0, false);
        } else if (repeating === 1 && currentTrackIndex == queue.length - 1) {
          playerRef.current?.seekTo(0, false);
        }
      }
    }
  }

  function seekForwards10() {
    playerRef.current?.seekTo(playerRef.current.getCurrentTime() + 10, true);

    if (currentTrackIndex == null) {
      return;
    }

    if (currentTime + 10 >= (queue?.[currentTrackIndex]?.duration ?? 0)) {
      if (
        currentTrackIndex != null &&
        queue &&
        queue.length > currentTrackIndex
      ) {
        if (repeating === false) {
          setCurrentTrackIndex(currentTrackIndex + 1);
        } else if (
          repeating === true &&
          currentTrackIndex == queue.length - 1
        ) {
          setCurrentTrackIndex(0);
          playerRef.current?.seekTo(0, false);
        } else if (repeating === 1 && currentTrackIndex == queue.length - 1) {
          playerRef.current?.seekTo(0, false);
        }
      }
    }
  }

  async function addSongToStars(songData: YTMusicResult) {
    const trackWithId = { ...songData, id: v4() };
    setStarredSongs([...starredSongs, trackWithId]);

    const user = (await supabase.auth.getUser()).data.user;

    if (!user) return;

    fetch("/api/star-song", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        songs: [trackWithId],
        user_id: user.id,
        remove: false,
      }),
    });
  }

  async function removeSongFromStars(songData: YTMusicResult) {
    setStarredSongs(
      starredSongs.filter((song) => song.videoId !== songData.videoId)
    );

    const user = (await supabase.auth.getUser()).data.user;

    if (!user) return;

    fetch("/api/star-song", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        songs: [songData],
        user_id: user.id,
        remove: true,
      }),
    });
  }

  async function addSongToQueue(songData: YTMusicResult) {
    const trackWithId = { ...songData, id: v4() };
    setQueue([...(queue ?? []), trackWithId]);
  }
  // Player params and functions

  const opts: YouTubeProps["opts"] = {
    height: "0",
    width: "0",
    playerVars: {
      autoplay: 1,
    },
    host: "https://www.youtube.com",
    controls: 0,
    modestbranding: 1,
    rel: 0,
  };

  const onPlayerReady: YouTubeProps["onReady"] = (event) => {
    playerRef.current = event.target;
  };

  const onPlayerEnd: YouTubeProps["onEnd"] = () => {
    if (
      currentTrackIndex != null &&
      queue &&
      queue?.length > currentTrackIndex &&
      repeating === false
    ) {
      setCurrentTrackIndex(currentTrackIndex + 1);
    } else if (
      currentTrackIndex != null &&
      queue &&
      repeating === true &&
      currentTrackIndex == queue.length - 1
    ) {
      setCurrentTrackIndex(0);
      playerRef.current?.seekTo(0, true);
    } else if (
      currentTrackIndex != null &&
      queue &&
      repeating === 1 &&
      currentTrackIndex == queue.length - 1
    ) {
      playerRef.current?.seekTo(0, true);
    }
  };

  const onStateChange: YouTubeProps["onStateChange"] = (event) => {
    setPlayerState(event.target.getPlayerState());
  };

  // UseEffect callbacks

  // Search handler
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        const results = await getSearchResults(searchQuery);
        for (let i = 0; i < results.length; i++) {
          results[i].id = v4();
        }
        setSearchResults(results);
      } else {
        setSearchResults(null);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  //Updates the player time
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Gets starred songs
  useEffect(() => {
    let stored;

    try {
      stored = JSON.parse(localStorage.getItem("starredSongs") || "[]");
    } catch {
      stored = [];
    }

    if (stored.length > 0) setStarredSongs(stored);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user;

      if (!user) return;

      for (let i = 0; i < starredSongs.length; i++) {
        addSongToStars(starredSongs[i]);
      }

      const res = await fetch(
        `/api/private-profile?user_id=${session.user.id}`,
        {
          method: "POST",
          body: JSON.stringify({
            user_id: user.id,
          }),
        }
      );

      const json = await res.json();

      if ("starredSongs" in json) {
        setStarredSongs([...starredSongs, ...json.starredSongs]);
        setLocalStorage("starredSongs", String(...json.starredSongs));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase.auth]);

  // Sets the starred songs

  useEffect(() => {
    setLocalStorage("starredSongs", JSON.stringify(starredSongs));
  }, [starredSongs]);

  return (
    <>
      <div className="absolute flex items-center justify-center w-full top-16 md:top-2">
        <div className="max-w-[560px] max-h-[80vh] overflow-y-auto transition-all z-100 border-2 border-white p-2! rounded-2xl bg-gray-400/10 backdrop-blur-md backdrop-filter hover:bg-gray-200/20 focus:bg-white/30">
          <div className="flex items-center justify-center gap-2">
            <FaSearch />
            <input
              className="focus:outline-0"
              id="searchbar"
              placeholder="Search for any song..."
              type="text"
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              value={searchQuery ?? ""}
            />
          </div>
          {searchQuery && (
            <div className="flex flex-col gap-2 mt-2">
              {searchResults == null ? (
                <p className="text-white/70 ml-2!">Searching...</p>
              ) : searchResults.length > 0 ? (
                searchResults.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2! rounded-lg"
                    onClick={() => {
                      if (queue == null || queue.length === 0) {
                        setCurrentTrackIndex(0);
                      }
                      addSongToQueue(track);
                      setSearchQuery("");
                    }}
                  >
                    <img
                      src={`/api/ytmusic/thumbnail?url=${encodeURIComponent(
                        track.thumbnails.sort((a, b) => b.width - a.width)[0]
                          .url
                      )}`}
                      alt={track.name}
                      width={50}
                      height={50}
                      className="rounded-md"
                    />
                    <div>
                      <p className="text-white">{track.name}</p>
                      <p className="text-sm text-white/70">
                        {track.artist.name}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-white/70">No results found</p>
              )}
            </div>
          )}
        </div>
      </div>
      <div
        className={`flex items-center relative justify-center h-[100%] gap-3`}
      >
        <MarqueeBg />
        <div
          className={clsx(
            "rounded-[12px] border-2 border-[#0096FF] backdrop-blur-md backdrop-filter backdrop-opacity-50 bg-[#0A1D37] p-[20px]! overflow-auto flex max-h-[80%]",
            queue ? "max-w-[60%]" : "max-w-[90%]"
          )}
        >
          <div className="flex flex-col">
            <div className="flex gap-[20px]! mb-4!">
              <div className="grow-0 shrink-0 basis-[250px] h-[250px] w-[250px] flex justify-center items-center bg-white/10 rounded-xl overflow-hidden">
                {queue &&
                queue.length > 0 &&
                currentTrackIndex != null &&
                currentTrackIndex <= queue.length - 1 ? (
                  <img
                    src={`https://img.youtube.com/vi/${queue[currentTrackIndex].videoId}/maxresdefault.jpg`}
                    alt="Album Art"
                    crossOrigin="anonymous"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <MusicalNoteIcon
                    className="m-10! text-white/50"
                    id="musicIcon"
                  />
                )}
              </div>
              <div
                className="info flex flex-col justify-center w-[400px]"
                id="playerInfo"
              >
                <div className="flex items-center gap-3 top-icons">
                  <MarqueeText
                    className="flex-1 overflow-y-hidden text-3xl"
                    text={
                      queue &&
                      queue.length > 0 &&
                      currentTrackIndex != null &&
                      currentTrackIndex <= queue.length - 1
                        ? playerState == 3 || !playerRef.current
                          ? "Loading..."
                          : queue[currentTrackIndex].name
                        : "Not Playing"
                    }
                  />
                  {queue &&
                    queue.length > 0 &&
                    currentTrackIndex != null &&
                    currentTrackIndex <= queue.length - 1 && (
                      <>
                        {starredSongs.some(
                          (song) =>
                            song.videoId === queue[currentTrackIndex].videoId
                        ) ? (
                          <StarIcon
                            id="favoritesBtn"
                            width={18}
                            height={18}
                            className={clsx(
                              "flex-shrink-0 w-[18px]! h-[18px]! cursor-pointer text-white/60 fill-white/60"
                            )}
                            onClick={() => {
                              removeSongFromStars(queue[currentTrackIndex]);
                            }}
                          />
                        ) : (
                          <StarIcon
                            id="favoritesBtn"
                            width={18}
                            height={18}
                            className={clsx(
                              "flex-shrink-0 w-[18px]! h-[18px]! cursor-pointer text-white/60"
                            )}
                            onClick={() => {
                              addSongToStars(queue[currentTrackIndex]);
                            }}
                          />
                        )}
                      </>
                    )}
                </div>

                <div className="mb-[20px]! text-gray-500">
                  {queue &&
                    queue.length > 0 &&
                    currentTrackIndex != null &&
                    currentTrackIndex <= queue.length - 1 &&
                    queue[currentTrackIndex].artist.name}
                </div>
                <div>
                  <div className="flex gap-3 mb-[10px]! w-full items-center justify-center">
                    <button
                      type="button"
                      title="Seek backwards 10s"
                      onClick={seekBackwards10}
                      className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white p-3! flex items-center justify-center"
                    >
                      <FaBackward id="backward10" className="size-full" />
                    </button>
                    <button
                      type="button"
                      title="Seek backwards 5s"
                      onClick={seekBackwards5}
                      className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white p-3! flex items-center justify-center"
                    >
                      <FaChevronLeft id="backward5" className="size-full" />
                    </button>
                    {playerRef.current ? (
                      <>
                        {playerState == 1 ? (
                          <>
                            <button
                              type="button"
                              title="Pause song"
                              onClick={pauseSong}
                              className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white p-3! flex items-center justify-center"
                            >
                              <FaPause className="size-full" />
                            </button>
                          </>
                        ) : playerState == 2 ? (
                          <>
                            <button
                              type="button"
                              title="Resume song"
                              onClick={resumeSong}
                              className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white p-3! flex items-center justify-center"
                            >
                              <FaPlay className="size-full" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            title="Placeholder play button"
                            className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white p-3! flex items-center justify-center"
                          >
                            <FaPlay className="size-full" />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white p-3! flex items-center justify-center">
                          <FaPlay id="playPause" className="size-full" />
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      title="Seek forwards 5s"
                      onClick={seekForwards5}
                      className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white p-3! flex items-center justify-center"
                    >
                      <FaChevronRight id="forward5" className="size-full" />
                    </button>
                    <button
                      type="button"
                      title="Seek forwards 10s"
                      onClick={seekForwards10}
                      className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white p-3! flex items-center justify-center"
                    >
                      <FaForward id="forward10" className="size-full" />
                    </button>
                  </div>
                  <div className="control-row flex gap-3! mb-[15px]! w-full items-center justify-center">
                    {playerRef.current ? (
                      <>
                        {" "}
                        {repeating === false ? (
                          <>
                            <button
                              type="button"
                              title="Repeat song"
                              onClick={() => {
                                setRepeating(true);
                              }}
                              className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white/50 p-3! flex items-center justify-center"
                            >
                              <PiRepeat className="size-full" />
                            </button>
                          </>
                        ) : repeating === true ? (
                          <>
                            <button
                              type="button"
                              title="Repeat song once"
                              onClick={() => {
                                setRepeating(1);
                              }}
                              className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white p-3! flex items-center justify-center"
                            >
                              <PiRepeatBold className="size-full" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              title="Don't song"
                              onClick={() => {
                                setRepeating(false);
                              }}
                              className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white p-3! flex items-center justify-center"
                            >
                              <PiRepeatOnceBold className="size-full" />
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white p-3! flex items-center justify-center">
                          <PiRepeat className="size-full" />
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      title="Shuffle queue"
                      onClick={shuffleQueue}
                      className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white p-3! flex items-center justify-center"
                    >
                      <FaShuffle className="size-full" />
                    </button>
                    {muted ? (
                      <>
                        <button
                          type="button"
                          title="Unmute audio"
                          onClick={() => {
                            setMuted(false);
                            playerRef.current?.unMute();
                          }}
                          className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white p-3! flex items-center justify-center"
                        >
                          <FaVolumeUp className="size-full" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          title="Mute audio"
                          onClick={() => {
                            setMuted(true);
                            playerRef.current?.mute();
                          }}
                          className="bg-white/10 hover:bg-white/40 transition-all duration-400 rounded-full aspect-square size-10 text-white p-3! flex items-center justify-center"
                        >
                          <FaVolumeMute className="size-full" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {queue &&
                queue.length > 0 &&
                currentTrackIndex != null &&
                currentTrackIndex <= queue.length - 1 ? (
                  <div className="flex items-center w-full gap-2">
                    <input
                      title="seeker"
                      type="range"
                      min={0}
                      max={queue[currentTrackIndex].duration}
                      step={1}
                      value={currentTime ?? "0:00"}
                      onChange={(e) => {
                        const newTime = Number(e.target.value);
                        setCurrentTime(newTime);
                        if (playerRef.current) {
                          playerRef.current.seekTo(newTime, true);
                        }
                      }}
                      className={clsx(
                        "w-full h-[6px] cursor-pointer appearance-none rounded-3xl",
                        "bg-white/30 accent-white hover:h-[12px] transition-all duration-300 [&::-webkit-slider-thumb]:bg-blue-500",
                        ` [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                          [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3
                          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
                          [&::-ms-thumb]:h-3 [&::-ms-thumb]:w-3
                          [&::-ms-thumb]:rounded-full [&::-ms-thumb]:bg-white`
                      )}
                    />
                  </div>
                ) : (
                  <>
                    <div className="h-[6px] bg-white/20 rounded-3xl relative hover:h-[12px] transition-all duration-300 w-full"></div>
                  </>
                )}
                <div className="flex justify-between mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>
                    {queue &&
                    queue.length > 0 &&
                    currentTrackIndex != null &&
                    currentTrackIndex != null &&
                    currentTrackIndex <= queue.length - 1
                      ? "-" +
                        formatTime(
                          queue[currentTrackIndex].duration - currentTime
                        )
                      : "-0:00"}
                  </span>
                </div>
                {queue &&
                  queue.length > 0 &&
                  currentTrackIndex != null &&
                  currentTrackIndex <= queue.length - 1 && (
                    <YouTube
                      videoId={queue[currentTrackIndex].videoId}
                      onReady={onPlayerReady}
                      opts={opts}
                      onEnd={onPlayerEnd}
                      onStateChange={onStateChange}
                    />
                  )}
              </div>
              <div className="lyrics-info" id="lyricsInfo">
                <div className="lyrics-content" id="lyricsContent"></div>
              </div>
            </div>
          </div>
        </div>
        {((queue && queue.length) || (starredSongs && starredSongs.length)) >
          0 && (
          <motion.div className="flex flex-col gap-2 max-w-[30%] rounded-[12px] border-2 border-[#0096FF] backdrop-blur-md backdrop-filter backdrop-opacity-50 bg-[#0A1D37] p-[20px]! overflow-auto max-h-[80%]">
            <div className="flex items-center justify-center w-full gap-2">
              <PrimaryButton
                text="Queue"
                className={clsx(sideMenuPage === "queue" && "bg-gray-800")}
                onClick={() => setSideMenuPage("queue")}
              />
              <PrimaryButton
                text="Starred Songs"
                className={clsx(
                  sideMenuPage === "starredSongs" && "bg-gray-800"
                )}
                onClick={() => setSideMenuPage("starredSongs")}
              />
            </div>
            <motion.div layout>
              <AnimatePresence mode="wait">
                {sideMenuPage === "queue" && (
                  <motion.div
                    key="queue"
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-2"
                  >
                    {queue && queue.length > 0 ? (
                      queue.map((trackData, index) => (
                        <motion.div
                          layout
                          key={trackData.id}
                          className={clsx(
                            "flex items-center justify-between gap-3 cursor-pointer p-2! rounded-lg",
                            index === currentTrackIndex
                              ? "bg-white/10 hover:bg-white/20"
                              : "hover:bg-white/10"
                          )}
                        >
                          <button
                            onClick={() => setCurrentTrackIndex(index)}
                            className="w-full h-full"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={`/api/ytmusic/thumbnail?url=${encodeURIComponent(
                                  trackData.thumbnails.sort(
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    (a: any, b: any) => b.width - a.width
                                  )[0].url
                                )}`}
                                alt={trackData.name}
                                width={50}
                                height={50}
                                className="rounded-md"
                              />
                              <div className="flex flex-col gap-1">
                                <MarqueeText
                                  text={trackData.name}
                                  className="overflow-x-auto text-left"
                                />
                                <MarqueeText
                                  text={trackData.artist.name}
                                  className="text-sm text-left text-white/70 border-white/70"
                                />
                              </div>
                            </div>
                          </button>
                          <button
                            title="Remove song from queue"
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (
                                currentTrackIndex != null &&
                                index >= currentTrackIndex
                              ) {
                                setQueue(
                                  queue.filter(
                                    (track) => track.id !== trackData.id
                                  )
                                );
                              } else if (
                                currentTrackIndex != null &&
                                index < currentTrackIndex
                              ) {
                                setCurrentTrackIndex(currentTrackIndex - 1);
                              }
                            }}
                            className="rounded-full mr-2! p-3! bg-white/20 hover:bg-white/30"
                          >
                            <FaTrashAlt />
                          </button>
                        </motion.div>
                      ))
                    ) : (
                      <p className="w-full text-center text-gray-400">
                        Your queue is empty
                      </p>
                    )}
                  </motion.div>
                )}

                {sideMenuPage === "starredSongs" && (
                  <motion.div
                    key="starred"
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-2"
                  >
                    {starredSongs && starredSongs.length > 0 ? (
                      starredSongs.map((trackData) => (
                        <motion.div
                          layout
                          key={trackData.id}
                          className="flex items-center justify-between gap-3 cursor-pointer p-2! rounded-lg hover:bg-white/10"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (!queue || queue.length === 0) {
                                addSongToQueue(trackData);
                                setCurrentTrackIndex(0);
                              } else {
                                addSongToQueue(trackData);
                              }
                            }}
                            className="w-full h-full"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={`/api/ytmusic/thumbnail?url=${encodeURIComponent(
                                  trackData.thumbnails.sort(
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    (a: any, b: any) => b.width - a.width
                                  )[0].url
                                )}`}
                                alt={trackData.name}
                                width={50}
                                height={50}
                                className="rounded-md"
                              />
                              <div className="flex flex-col gap-1">
                                <MarqueeText
                                  text={trackData.name}
                                  className="overflow-x-auto text-left"
                                />
                                <MarqueeText
                                  text={trackData.artist.name}
                                  className="text-sm text-left text-white/70 border-white/70"
                                />
                              </div>
                            </div>
                          </button>
                          <button
                            title="Remove song from starred songs"
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removeSongFromStars(trackData);
                            }}
                            className="rounded-full mr-2! p-3! bg-white/20 hover:bg-white/30"
                          >
                            <FaTrashAlt />
                          </button>
                        </motion.div>
                      ))
                    ) : (
                      <p className="w-full text-center text-gray-400">
                        You have no starred songs.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </div>
    </>
  );
}
