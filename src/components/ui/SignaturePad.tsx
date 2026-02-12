import { useRef, useEffect, useState } from 'react'
import { Eraser, Check, X } from '@phosphor-icons/react'

interface SignaturePadProps {
    onSave: (signatureDataUrl: string) => void
    onCancel: () => void
    signerName?: string
}

export default function SignaturePad({ onSave, onCancel, signerName }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set up canvas
        ctx.strokeStyle = '#1e3a5f'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Fill with white background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw signature line
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(20, canvas.height - 40)
        ctx.lineTo(canvas.width - 20, canvas.height - 40)
        ctx.stroke()

        // Reset stroke style for signature
        ctx.strokeStyle = '#1e3a5f'
        ctx.lineWidth = 2
    }, [])

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }

        const rect = canvas.getBoundingClientRect()

        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            }
        }

        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        }
    }

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx) return

        e.preventDefault()
        setIsDrawing(true)
        setHasSignature(true)

        const { x, y } = getCoordinates(e)
        ctx.beginPath()
        ctx.moveTo(x, y)
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return

        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx) return

        e.preventDefault()
        const { x, y } = getCoordinates(e)
        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const stopDrawing = () => {
        setIsDrawing(false)
    }

    const clearSignature = () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx || !canvas) return

        // Clear canvas
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Redraw signature line
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(20, canvas.height - 40)
        ctx.lineTo(canvas.width - 20, canvas.height - 40)
        ctx.stroke()

        // Reset stroke style
        ctx.strokeStyle = '#1e3a5f'
        ctx.lineWidth = 2

        setHasSignature(false)
    }

    const handleSave = () => {
        const canvas = canvasRef.current
        if (!canvas || !hasSignature) return

        const dataUrl = canvas.toDataURL('image/png')
        onSave(dataUrl)
    }

    return (
        <div className="signature-pad-container">
            <div className="signature-pad-header">
                <h3>Electronic Signature</h3>
                <p>Sign below to complete this document</p>
            </div>

            {signerName && (
                <div className="signature-pad-signer">
                    Signing as: <strong>{signerName}</strong>
                </div>
            )}

            <div className="signature-pad-canvas-wrapper">
                <canvas
                    ref={canvasRef}
                    width={500}
                    height={200}
                    className="signature-pad-canvas"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                <span className="signature-pad-hint">Sign above the line</span>
            </div>

            <div className="signature-pad-actions">
                <button className="btn-secondary" onClick={clearSignature}>
                    <Eraser size={18} />
                    Clear
                </button>
                <div className="signature-pad-actions-right">
                    <button className="btn-outline" onClick={onCancel}>
                        <X size={18} />
                        Cancel
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={!hasSignature}
                    >
                        <Check size={18} />
                        Sign & Complete
                    </button>
                </div>
            </div>

            <p className="signature-pad-disclaimer">
                By signing above, I certify that the information provided is accurate and complete
                to the best of my knowledge. This electronic signature is legally binding.
            </p>
        </div>
    )
}
