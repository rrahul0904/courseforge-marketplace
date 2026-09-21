import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {title:"CourseForge",description:"A marketplace for expert-led courses, cohorts and learning products."};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><div className="shell"><nav className="nav"><Link href="/" className="brand">CourseForge</Link><div className="navlinks"><Link href="/courses">Explore</Link><Link href="/instructor/studio">Teach</Link><Link href="/admin">Admin</Link></div></nav>{children}<footer className="footer">CourseForge · Marketplace, learning delivery and instructor commerce in one platform.</footer></div></body></html>
}
