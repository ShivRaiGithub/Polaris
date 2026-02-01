"use client"

import React from "react"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import { Shield, Upload, Camera, X, ArrowRight, Loader2, FileImage, Zap, SwitchCamera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StellarBackground } from "@/components/stellar-background"

interface ExtractedData {
  name?: string
  dob?: string
  gender?: string
  aadhaarNumber?: string
  address?: string
  fatherName?: string
  [key: string]: string | undefined
}

export default function VerifyPage() {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [useFrontCamera, setUseFrontCamera] = useState(true)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles])
      
      // Create previews
      selectedFiles.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          setPreviews(prev => [...prev, e.target?.result as string])
        }
        reader.readAsDataURL(file)
      })
      
      setExtractedData(null)
      setError(null)
    }
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }, [])

  const startCamera = useCallback(async (frontCamera = true) => {
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      
      const constraints = {
        video: { 
          facingMode: frontCamera ? "user" : "environment",
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => {
            console.log("[v0] Video play error:", e)
          })
        }
      }
      setCameraActive(true)
      setUseFrontCamera(frontCamera)
      setError(null)
    } catch (err) {
      console.log("[v0] Camera error:", err)
      setError("Could not access camera. Please check permissions and ensure camera is not in use by another app.")
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }, [])
  
  const flipCamera = useCallback(() => {
    startCamera(!useFrontCamera)
  }, [startCamera, useFrontCamera])

  const capturePhoto = useCallback(() => {
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const canvas = document.createElement("canvas")
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        const imageData = canvas.toDataURL("image/jpeg", 0.9)
        setCapturedImages(prev => [...prev, imageData])
        setPreviews(prev => [...prev, imageData])
        
        // Convert to file
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" })
            setFiles(prev => [...prev, file])
          }
        }, "image/jpeg", 0.9)
        
        setExtractedData(null)
        setError(null)
      }
    } else {
      setError("Camera not ready. Please wait a moment and try again.")
    }
  }, [])

  const removeCapturedImage = useCallback((index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index))
    // Also remove from files and previews
    const capturedIndex = previews.findIndex(p => p === capturedImages[index])
    if (capturedIndex !== -1) {
      setFiles(prev => prev.filter((_, i) => i !== capturedIndex))
      setPreviews(prev => prev.filter((_, i) => i !== capturedIndex))
    }
  }, [capturedImages, previews])

  const extractData = useCallback(async () => {
    if (files.length === 0 && capturedImages.length === 0) {
      setError("Please upload or capture at least one image")
      return
    }

    setIsExtracting(true)
    setError(null)

    try {
      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append(`file${index}`, file)
      })

      // Send to Python backend for extraction
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to extract data")
      }

      const data = await response.json()
      setExtractedData(data)
    } catch (err) {
      setError("Failed to extract data. Please try again.")
      console.log("[v0] Extraction error:", err)
    } finally {
      setIsExtracting(false)
    }
  }, [files, capturedImages])

  const resetAll = useCallback(() => {
    setFiles([])
    setPreviews([])
    setCapturedImages([])
    setExtractedData(null)
    setError(null)
    stopCamera()
  }, [stopCamera])

  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      <StellarBackground />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#262626]">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <Shield className="h-8 w-8 text-[#a78bfa] transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 blur-md bg-[#a78bfa]/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-xl font-bold text-[#fafafa]">ZK-Verify</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="outline" className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full bg-transparent">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-black text-[#fafafa] mb-4">
              Identity Verification
            </h1>
            <p className="text-[#a3a3a3] text-lg max-w-2xl mx-auto">
              Upload your Aadhaar card (front and back) or use your camera to capture them. 
              Your data will be extracted securely for ZK proof generation.
            </p>
          </div>

          <div className="grid gap-8">
            {/* Upload Section */}
            <Card className="bg-[#111111] border-[#262626]">
              <CardHeader>
                <CardTitle className="text-[#fafafa] flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-[#a78bfa]" />
                  Upload Documents
                </CardTitle>
                <CardDescription className="text-[#a3a3a3]">
                  Upload front and back of your Aadhaar card together
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Upload Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#262626] rounded-xl p-8 text-center cursor-pointer hover:border-[#a78bfa] transition-colors group"
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-[#a3a3a3] group-hover:text-[#a78bfa] transition-colors" />
                  <p className="text-[#fafafa] font-medium mb-2">Click to upload files</p>
                  <p className="text-[#a3a3a3] text-sm">PNG, JPG up to 10MB each</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Camera Section */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-[#262626]" />
                  <span className="text-[#a3a3a3] text-sm">or</span>
                  <div className="flex-1 h-px bg-[#262626]" />
                </div>

                {!cameraActive ? (
                  <Button
                    onClick={() => startCamera(true)}
                    variant="outline"
                    className="w-full border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] py-6 bg-transparent"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Open Camera
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${useFrontCamera ? "scale-x-[-1]" : ""}`}
                      />
                      {/* Flip Camera Button */}
                      <button
                        onClick={flipCamera}
                        className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                        title="Flip Camera"
                      >
                        <SwitchCamera className="w-5 h-5 text-white" />
                      </button>
                      <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 rounded text-xs text-white">
                        {useFrontCamera ? "Front Camera" : "Back Camera"}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button
                        onClick={capturePhoto}
                        className="flex-1 bg-[#fbbf24] text-[#0a0a0a] hover:bg-[#fbbf24]/90"
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        Capture Photo
                      </Button>
                      <Button
                        onClick={stopCamera}
                        variant="outline"
                        className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] bg-transparent"
                      >
                        <X className="w-5 h-5 mr-2" />
                        Close Camera
                      </Button>
                    </div>
                  </div>
                )}

                {/* Preview Images */}
                {previews.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[#fafafa] font-medium">Selected Images ({previews.length})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {previews.map((preview, index) => (
                        <div key={index} className="relative group rounded-xl overflow-hidden">
                          <img
                            src={preview || "/placeholder.svg"}
                            alt={`Preview ${index + 1}`}
                            className="w-full aspect-[3/4] object-cover"
                          />
                          <button
                            onClick={() => removeFile(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white">
                            {index === 0 ? "Front" : index === 1 ? "Back" : `Image ${index + 1}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extract Button */}
                {previews.length > 0 && !extractedData && (
                  <Button
                    onClick={extractData}
                    disabled={isExtracting}
                    className="w-full bg-[#fbbf24] text-[#0a0a0a] hover:bg-[#fbbf24]/90 py-6 text-lg font-semibold"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Extracting Data...
                      </>
                    ) : (
                      <>
                        Extract Data
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                )}

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Extracted Data Display */}
            {extractedData && (
              <Card className="bg-[#111111] border-[#262626]">
                <CardHeader>
                  <CardTitle className="text-[#fafafa] flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#a78bfa]" />
                    Extracted Information
                  </CardTitle>
                  <CardDescription className="text-[#a3a3a3]">
                    Review your extracted data before generating ZK proof
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    {Object.entries(extractedData).map(([key, value]) => (
                      value && (
                        <div key={key} className="flex justify-between items-center p-4 bg-[#1a1a1a] rounded-xl">
                          <span className="text-[#a3a3a3] capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-[#fafafa] font-medium">{value}</span>
                        </div>
                      )
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={resetAll}
                      variant="outline"
                      className="flex-1 border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] bg-transparent"
                    >
                      Reset & Start Over
                    </Button>
                    <Button
                      id="generate-proof-btn"
                      className="flex-1 bg-[#a78bfa] text-[#0a0a0a] hover:bg-[#a78bfa]/90 font-semibold"
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      Generate ZK Proof
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
