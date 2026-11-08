"use client"; 
 
import { useState,useEffect } from "react"; 
import { ArrowLeft, Zap, Keyboard, Camera, Menu, Bell } from "lucide-react"; 
import KassaSidebar from "@/components/KassaSidebar"; 
import Link from "next/link"; 
 
export default function ScanProductPage() { 
  const [sidebarOpen, setSidebarOpen] = useState(false); 
 
   // Branch selected from the dashboard 
      const [selectedBranch, setSelectedBranch] = useState("Main branch"); 
     
      // Get the selected branch from the dashboard 
      useEffect(() => { 
        const savedBranch = localStorage.getItem("selectedBranch"); 
     
        if (savedBranch) { 
          setSelectedBranch(savedBranch); 
        } 
      }, []); 
     
      // Listen for branch changes 
      useEffect(() => { 
        const handleBranchChange = () => { 
          const savedBranch = localStorage.getItem("selectedBranch"); 
     
          if (savedBranch) { 
            setSelectedBranch(savedBranch); 
          } 
        }; 
     
        window.addEventListener("storage", handleBranchChange); 
     
        return () => { 
          window.removeEventListener("storage", handleBranchChange); 
        }; 
      }, []); 
 
  return ( 
    <div className="min-h-screen overflow-x-hidden bg-gray-50"> 
      <KassaSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      /> 
 
      <main className="min-h-screen lg:ml-[198px] "> 
        {/* Header */} 
                <header className="flex min-h-[80px] items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 lg:px-8"> 
                  <div className="flex min-w-0 items-center gap-3"> 
                    <button 
                      type="button" 
                      onClick={() => setSidebarOpen(true)} 
                      className="shrink-0 rounded-md p-1.5 text-[#374151] transition hover:bg-[#F3F4F6] lg:hidden" 
                      aria-label="Open menu" 
                    > 
                      <Menu size={22} /> 
                    </button> 
         
                    <h1 className="truncate text-[18px] font-bold text-[#182033] sm:text-[20px] lg:text-[21px]"> 
                      Scan product 
                    </h1> 
                  </div> 
         
                  <div className="flex shrink-0 items-center gap-3 sm:gap-5"> 
                    {/* Branch display - no dropdown */} 
                    <div className="hidden w-[130px] sm:block sm:w-[150px] lg:w-[162px]"> 
                      <div className="flex h-[34px] w-full items-center justify-between rounded-[9px] border border-[#D8DCE3] bg-white px-3 text-[12px] text-[#374151] sm:text-[13px]"> 
                        <span className="truncate">{selectedBranch}</span> 
                      </div> 
                    </div> 
                    <button className="relative flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#F8F9FA]"> 
                      <Bell size={17} className="text-[#98A1AE]" /> 
         
                      <span className="absolute right-[8px] top-[6px] h-[7px] w-[7px] rounded-full bg-[#E54848]" /> 
                    </button> 
         
                    <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#E5F5F0] text-[12px] font-semibold text-[#08745F]"> 
                      AO 
                    </div> 
                  </div> 
                </header> 
       
 
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium mt-4 mb-4 px-8" 
        > 
          <ArrowLeft size={14} /> 
          Back to home 
        </Link> 
 
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-3 "> 
          {/* Scanner viewport */} 
          <div className="lg:col-span-2 bg-[#0B1220] rounded-xl p-5 sm:p-8 flex flex-col items-center justify-between min-h-[380px] sm:min-h-[520px]"> 
            <div className="relative w-full max-w-md flex-1 flex items-center justify-center"> 
              {/* corner brackets */} 
              <div className="absolute top-8 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" /> 
              <div className="absolute top-8 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" /> 
              <div className="absolute bottom-8 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" /> 
              <div className="absolute bottom-8 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-md" /> 
 
              <div className="flex items-center gap-[3px]"> 
                {Array.from({ length: 28 }).map((_, i) => ( 
                  <div 
                    key={i} 
                    className="bg-white" 
                    style={{ 
                      width: i % 3 === 0 ? "4px" : "2px", 
                      height: "56px", 
                    }} 
                  /> 
                ))} 
              </div> 
              <div className="absolute w-full h-0.5 bg-emerald-400" /> 
            </div> 
 
            <div className="text-center mb-4"> 
              <p className="text-white text-sm">Position the barcode within the frame</p> 
              <p className="text-gray-400 text-xs mt-1">Scanner integration coming soon</p> 
            </div> 
 
            <div className="flex items-center gap-4 sm:gap-6"> 
              <button disabled title="Camera scanner coming soon" className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white/50 shrink-0"> 
                <Zap size={18} /> 
              </button> 
 
              <Link href={"/scan/product-code"} 
                className="flex flex-col items-center gap-1 text-white"> 
                <span className="w-11 h-11 rounded-full bg-emerald-700 flex items-center justify-center"> 
                  <Keyboard size={18} /> 
                </span> 
                <span className="text-xs text-gray-300">Enter code manually</span> 
              </Link> 
              <button disabled title="Camera scanner coming soon" className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white/50"> 
                <Camera size={18} /> 
              </button> 
            </div> 
          </div> 
 
          {/* No fabricated scan results: actual barcode scanning is not integrated yet. */}
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-base font-semibold text-gray-900">No product scanned yet</h2>
              <p className="mt-2 text-sm text-gray-500">
                Real product results will appear here when barcode scanning is connected to inventory.
                No sample products are shown.
              </p>
              <Link href="/sales/new" className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-900">
                View available inventory
              </Link>
            </div>
          </div>
        </div> 
      </main> 
    </div> 
  ); 
}