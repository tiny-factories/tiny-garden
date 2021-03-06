import React from "react";
import { useCurrentUser } from "@/hooks/index";
import Link from "next/link";

export default function Navagation({ post }) {
  const [user, { mutate }] = useCurrentUser();
  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "DELETE",
    });
    mutate(null);
  };
  return (
    <>
      <style jsx>
        {`
          .nav {
            padding: 0;
            margin-top: 20px;
            list-style: none;
            text-align: center;
          }

          .nav-item {
            display: inline-block;
            margin-right: 1em;
          }

          .nav-item a[href]:not(:hover) {
            text-decoration: none;
          }

          .nav-item a[href]:hover {
            text-decoration: none;
            font-weight: 500;
          }

          .nav-item-active {
            font-weight: 500;
          }
        `}
      </style>
      <nav className="">
        <Link href="/">
          <a>
            <h1>🌱 Tiny Garden</h1>
          </a>
        </Link>
        <div>
          {!user ? (
            <>
              <Link href="/blog">
                <a className="nav-item">Blog</a>
              </Link>
              {/* <Link href="/user/MQc2aPSY0763">
                <a className="nav-item">Explore</a>
              </Link> */}
              <Link href="/join">
                <a className="nav-item">Join</a>
              </Link>
            </>
          ) : (
            <>
              <Link href={`/user/${user._id}`}>
                <a className="nav-item">My garden</a>
              </Link>
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
              <a tabIndex={0} role="button" onClick={handleLogout}>
                Logout
              </a>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
