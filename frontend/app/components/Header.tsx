"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full py-4 px-6 flex justify-center sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md">
      <div className="w-full max-w-[1440px] flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight">AIStarterkit</span>
            <span className="bg-[rgba(114,92,255,0.9)] text-[10px] px-2 py-0.5 rounded-tr-lg rounded-tl-lg rounded-br-lg text-white font-medium uppercase tracking-wider">
              Demo
            </span>
          </Link>
        </div>

        {/* Navigation Pill */}
        <nav className="hidden lg:flex items-center bg-white/[0.03] p-1 rounded-full border border-white/5 backdrop-blur-sm">
          <Link
            href="/"
            className="px-4 py-1.5 text-sm font-medium bg-white/10 text-white rounded-full transition-all"
          >
            Home
          </Link>
          <div className="relative group">
            <button className="px-4 py-1.5 text-sm font-medium text-white/70 group-hover:text-white flex items-center gap-1 transition-colors">
              Products
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {/* Dropdown */}
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a2e] border border-white/10 rounded-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <DropdownItem href="/products/text-generator" text="Text Generator" />
              <DropdownItem href="/products/image-generator" text="Image Generator" />
              <DropdownItem href="/products/code-generator" text="Code Generator" />
              <DropdownItem href="/products/video-generator" text="Video Generator" />
            </div>
          </div>
          <div className="relative group">
            <button className="px-4 py-1.5 text-sm font-medium text-white/70 group-hover:text-white flex items-center gap-1 transition-colors">
              Pages
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {/* Dropdown */}
            <div className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a2e] border border-white/10 rounded-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <DropdownItem href="/about" text="About" />
              <DropdownItem href="/pricing" text="Pricing" />
              <DropdownItem href="/blog" text="Blog" />
              <DropdownItem href="/faq" text="FAQ" />
            </div>
          </div>
          <Link
            href="/contact"
            className="px-4 py-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            Contact
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </button>
          <Link
            href="/signin"
            className="text-sm font-medium text-white/70 hover:text-white transition-colors hidden sm:block"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="bg-gradient-to-r from-[rgb(114,92,255)] to-[rgb(181,177,255)] px-5 py-2.5 rounded-full text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
          >
            Get Started Free
          </Link>
          
          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden w-10 h-10 flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-[#0a0a0a] border-t border-white/10 p-4 lg:hidden">
          <nav className="flex flex-col gap-2">
            <Link href="/" className="px-4 py-2 text-white hover:bg-white/5 rounded-lg">Home</Link>
            <Link href="/products" className="px-4 py-2 text-white/70 hover:bg-white/5 rounded-lg">Products</Link>
            <Link href="/pages" className="px-4 py-2 text-white/70 hover:bg-white/5 rounded-lg">Pages</Link>
            <Link href="/contact" className="px-4 py-2 text-white/70 hover:bg-white/5 rounded-lg">Contact</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function DropdownItem({ href, text }: { href: string; text: string }) {
  return (
    <Link 
      href={href} 
      className="block px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
    >
      {text}
    </Link>
  );
}
