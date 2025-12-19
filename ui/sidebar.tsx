"use client";

import clsx from "clsx";

import { useSidebar } from "@/context/sidebar-context";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Link from "next/link";
import Image from "next/image";

import { GoHome, GoChevronLeft } from "react-icons/go";
import { IoGameControllerOutline } from "react-icons/io5";
import { SlGlobe } from "react-icons/sl";
import { BsGrid3X3GapFill, BsGear } from "react-icons/bs";
import { FaRegUserCircle } from "react-icons/fa";
import { FaRegCircleQuestion } from "react-icons/fa6";
import { KeyIcon } from "@heroicons/react/24/outline";
import { MdOutlineFeedback } from "react-icons/md";
import { GrUpdate } from "react-icons/gr";

import Topbar from "./topbar";

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { sidebarToggled, toggleSidebar, hydrated } = useSidebar();

  if (!hydrated) return null;

  function isActiveTab(linkHref: string, altLinks?: string[]) {
    if (pathname === "/pages/settings/p" && linkHref === "/pages/settings") {
      //special case for profile settings
      return false;
    }

    return (
      pathname === linkHref ||
      (altLinks && altLinks.includes(pathname)) ||
      pathname.startsWith(linkHref + "/")
    );
  }

  function NavbarLink({
    title,
    url,
    Icon,
    altLinks,
  }: {
    title: string;
    url: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    altLinks?: string[];
  }) {
    function handleClick() {
      router.push(url);
    }

    return (
      <li
        onClick={handleClick}
        className={clsx(
          !sidebarToggled
            ? "items-center! aspect-square! xl:w-[45px]!"
            : "w-[90%] ml-[16px]!",
          "h-[35px]! xl:h-[45px]! flex transition-all duration-400 rounded-2xl disable-no-m-p hover:bg-white hover:text-black m-2!",
          isActiveTab(url, altLinks) && "bg-white text-black"
        )}
      >
        <button type="button" className="w-full h-full disable-no-m-p">
          <div
            className={clsx(
              "box-content flex w-full h-full items-center", !sidebarToggled ? "justify-center" : "pl-4!"
            )}
          >
            <Icon className="z-10 flex items-center justify-center w-4 h-4 xl:w-5 xl:h-5" />
            <span
              className={clsx(
                "nav-label disable-no-m-p transition-all",
                !sidebarToggled && "opacity-0 content-[] w-0",
                sidebarToggled && "opacity-100 ml-2!"
              )}
            >
              {title}
            </span>
          </div>
        </button>
      </li>
    );
  }

  return (
    mounted && (
      <div className="flex w-screen h-screen">
        {/* topbar */}

        <Topbar />

        {/* sidebar */}
        <aside
          className={clsx(
            "overflow-y-auto sidebar hidden md:block h-full md:ml-[16px]! md:mt-[16px]! md:mb-[16px]! md:h-[calc(100vh-32px)]! md:rounded-[16px]! border-white border-r-2 md:border-2 transition-all duration-400",
            sidebarToggled ? "sidebar-expanded w-[270px]" : "collapsed"
          )}
        >
          <header className="flex justify-between sidebar-header">
            <Link
              href="/home"
              className="header-logo w-[46px] h-[46px] flex justify-center items-center"
            >
              <Image
                src="/logo-png-removebg-preview.png"
                height={40}
                width={40}
                alt="PeteZah"
                unoptimized={process.env.NODE_ENV === "development"}
              />
            </Link>
            <div
              className={clsx("spacer mt-20px!", { nospacer: sidebarToggled })}
            ></div>
            <button
              className={clsx(
                "toggler transition-all w-[40px] absolute bg-white text-black flex justify-center items-center rounded-xl h-[40px] hover:bg-gray-300"
              )}
              type="button"
              onClick={toggleSidebar}
            >
              <GoChevronLeft
                className={clsx(
                  "material-symbols-rounded transition-all",
                  !sidebarToggled && "rotate-180"
                )}
              >
                chevron_left
              </GoChevronLeft>
            </button>
          </header>

          <div
            className={clsx("spacer spacer-margin-top transition-all duration-400", {
              nospacer: sidebarToggled,
            })}
          ></div>

          <hr
            className={clsx(
              !sidebarToggled && "w-[80%] ml-[10%]!",
              sidebarToggled && "w-[90%] ml-[5%]!",
              "transition-all"
            )}
          />

          <nav className="w-full max-h-full overflow-x-hidden overflow-y-auto sidebar-nav">
            <ul
              className={clsx(
                "transition-all my-2 flex flex-col items-center",
                sidebarToggled && "pr-2!"
              )}
            >
              <NavbarLink
                title="Home"
                Icon={GoHome}
                url="/home"
                altLinks={["/home"]}
              />
              <NavbarLink
                title="Games"
                Icon={IoGameControllerOutline}
                url="/g"
                altLinks={["/play"]}
              />
              <NavbarLink
                title="Apps"
                Icon={BsGrid3X3GapFill}
                url="/a"
                altLinks={["/app", "/pete-ai", "/pzm"]}
              />
              <NavbarLink
                title="Proxy (WIP)"
                Icon={SlGlobe}
                url="/pr"
              />
              <NavbarLink
                title="Access"
                Icon={KeyIcon}
                url="/access"
              />
            </ul>

            <hr
              className={clsx(
                !sidebarToggled && "w-[80%] ml-[10%]!",
                sidebarToggled && "w-[90%] ml-[5%]!", "transition-all duration-400"
              )}
            />

            <ul
              className={clsx(
                "transition-all my-2 flex flex-col items-center",
                sidebarToggled && "pr-2!"
              )}
            >
              <NavbarLink
                title="Profile"
                Icon={FaRegUserCircle}
                url="/p"
              />
              <NavbarLink
                title="Settings"
                Icon={BsGear}
                url="/settings"
              />
              <NavbarLink
                title="About"
                Icon={FaRegCircleQuestion}
                url="/about"
              />
              <NavbarLink
                title="Feedback"
                Icon={MdOutlineFeedback}
                url="/feedback"
              />
              <NavbarLink
                title="Changelog"
                Icon={GrUpdate}
                url="/changelog"
              />
            </ul>
          </nav>
        </aside>

        <main
          className={clsx(
            "main-content flex-1 overflow-y-auto border-white md:border-2 md:my-[16px]! md:mx-[10px]! md:h-[calc(100vh - 32px)]! md:rounded-[16px]! transition-all! duration-400 relative",
            sidebarToggled ? "sidebar-expanded" : ""
          )}
        >
          {children}
        </main>
      </div>
    )
  );
}
