import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Get all files from the form data
    const files: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file") && value instanceof File) {
        files.push(value)
        console.log(`[v0] Received file: ${key}, name: ${value.name}, size: ${value.size}`)
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      )
    }

    console.log(`[v0] Total files received: ${files.length}`)

    // Forward to Python backend
    // Set your Python server URL in environment variables
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || "http://localhost:8000/extract"
    
    console.log(`[v0] Sending to Python backend: ${pythonBackendUrl}`)

    // Create new FormData for Python backend
    // Use "files" as the key name - adjust based on your Python server's expected field name
    const pythonFormData = new FormData()
    files.forEach((file, index) => {
      // You can use "files" for multiple files or "file" for single
      pythonFormData.append("files", file, file.name)
    })

    try {
      const response = await fetch(pythonBackendUrl, {
        method: "POST",
        body: pythonFormData,
      })

      console.log(`[v0] Python backend response status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Python backend response data:", data)
        return NextResponse.json(data)
      } else {
        const errorText = await response.text()
        console.log(`[v0] Python backend error: ${errorText}`)
        throw new Error(`Python backend returned ${response.status}`)
      }
    } catch (fetchError) {
      console.log("[v0] Could not reach Python backend:", fetchError)
      
      // Return mock data for development when Python server is not running
      // REMOVE THIS IN PRODUCTION
      console.log("[v0] Returning mock data for development")
      return NextResponse.json({
        name: "John Doe",
        dob: "01/01/1990",
        gender: "Male",
        aadhaarNumber: "XXXX XXXX 1234",
        address: "123 Main Street, City, State - 123456",
        fatherName: "Robert Doe",
      })
    }
    
  } catch (error) {
    console.log("[v0] Error in extract API:", error)
    
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
