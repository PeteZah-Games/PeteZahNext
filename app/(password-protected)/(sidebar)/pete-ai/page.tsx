/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client";

import { useChat } from "@ai-sdk/react";
import MarqueeBg from "@/ui/backgrounds/marquee-bg";
import {
  ArrowUpCircleIcon,
  LockClosedIcon,
  LightBulbIcon,
  EyeSlashIcon,
  BoltIcon,
} from "@heroicons/react/24/solid";
import { MemoizedMarkdown } from "@/ui/memoized-markdown";
import { useEffect, useRef } from "react";
import Image from "next/image";
import clsx from "clsx";
import { SiGooglegemini } from "react-icons/si";

export default function Chat() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    append,
    setMessages,
  } = useChat({
    experimental_throttle: 50,
  });

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isUserAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      50;

    if (!isUserAtBottom) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  function MessageSuggestion({ prompt }: { prompt: string }) {
    const handleClick = async () => {
      const newUserMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
      };
      //@ts-ignore
      await append(newUserMessage);
    };

    return (
      <button
        className="px-3! py-2! bg-[#07142d]/80 backdrop-blur-xs rounded-2xl m-2! border-white border-2 z-3 hover:bg-black duration-500 transition-all"
        onClick={handleClick}
      >
        {prompt}
      </button>
    );
  }

  function wipeChat() {
    setMessages([]);
  }

  return (
    <div className="flex flex-col items-center h-full relative w-full bg-[#0A1D37] text-white overflow-hidden z-2">
      <MarqueeBg className="opacity-50" />
      <div className="flex flex-col items-center justify-between w-full h-full z-1">
        <div
          className={clsx(
            "flex flex-col items-center h-[90%] w-[80%]",
            !(messages.length > 0) && "justify-center"
          )}
        >
          {messages.length > 0 ? (
            <div
              ref={messagesContainerRef}
              className="px-4! w-full overflow-y-auto [scrollbar-color:#808080_white] bg-[#07142d]/80 backdrop-blur-xs rounded-b-2xl pt-3! pb-4! border-b-2 border-x-2 border-white"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex my-2! whitespace-pre-wrap ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-t-2xl ${
                      message.role === "user"
                        ? "bg-blue-500 text-white rounded-bl-2xl py-2!"
                        : "bg-[#1f2b47] text-white rounded-br-2xl p-3!"
                    }`}
                  >
                    {message.parts.map((part, i) => {
                      if (part.type === "text") {
                        return (
                          <div className="" key={`${message.id}-${i}`}>
                            <MemoizedMarkdown content={part.text} />
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="flex flex-col items-center justify-center bg-[#07142d]/80 backdrop-blur-xs rounded-2xl p-4! border-white border-2">
                <Image
                  src="/storage/images/logo-png-removebg-preview.png"
                  alt="Pete AI Logo"
                  width={200}
                  height={200}
                  unoptimized={process.env.NODE_ENV === "development"}
                />
                <p className="text-3xl font-bold">Pete AI</p>
                <div className="flex items-center justify-around gap-2">
                  <div className="flex items-center">
                    <LockClosedIcon width={20} height={30} />
                    <p className="ml-1!">Secure</p>
                  </div>
                  <span className="text-gray-500">|</span>
                  <div className="flex items-center">
                    <LightBulbIcon width={20} height={30} />
                    <p className="ml-1!">Helpful</p>
                  </div>
                  <span className="text-gray-500">|</span>
                  <div className="flex items-center">
                    <BoltIcon width={20} height={30} />
                    <p className="ml-1!">Instant</p>
                  </div>
                  <span className="text-gray-500">|</span>
                  <div className="flex items-center">
                    <EyeSlashIcon width={20} height={30} />
                    <p className="ml-1!">Confidential</p>
                  </div>
                </div>
                <p className="flex items-center justify-center text-md">
                  Powered by Gemini <SiGooglegemini className="ml-2!" />
                </p>
                <p className="text-md mt-5!">
                  Type a message below to get started.
                </p>
              </div>
              <div className="mt-3! flex flex-col items-center">
                <div className="flex justify-center">
                  <MessageSuggestion prompt="Tell me about yourself." />
                  <MessageSuggestion prompt="Show me around the site." />
                  <MessageSuggestion prompt="How can I contribute to the proxy?" />
                </div>
                <div className="flex justify-center">
                  <MessageSuggestion prompt="How do I learn to code?" />
                  <MessageSuggestion prompt="Tell me a joke." />
                </div>
              </div>
            </div>
          )}
        </div>

        <form
          className="flex items-center justify-center w-full h-[10%]"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() === "") return;
            handleSubmit(e);
          }}
        >
          <div className="relative w-1/2">
            <input

              type="textarea"
              className="px-4! py-2! bg-black border-2 border-white rounded-2xl transition-colors duration-500 w-full pr-12!"
              value={input}
              placeholder="Say something..."
              onChange={handleInputChange}
            />
            <button
              title="submit"
              type="submit"
              className="absolute top-1/2 right-2 transform -translate-y-1/2 rounded-full p-0!"
            >
              <ArrowUpCircleIcon
                width={36}
                height={36}
                color={input.trim() == "" ? "gray" : "white"}
                className="object-cover rounded-full"
              />
            </button>
          </div>
          <button
            className={clsx(
              "bg-black rounded-2xl px-2! py-1! text-red-500 border-2! border-white mx-2! transition-opacity duration-500",
              messages.length > 0 ? "opacity-100" : "opacity-0 hidden"
            )}
            type="submit"
            onClick={wipeChat}
          >
            Wipe chat
          </button>
        </form>
      </div>
    </div>
  );
}
