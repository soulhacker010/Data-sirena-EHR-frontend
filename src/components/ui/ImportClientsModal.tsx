import { useState, useRef } from 'react'
import Modal from './Modal'
import {
    UploadSimple,
    FileText,
    CheckCircle,
    XCircle,
    Warning,
    DownloadSimple,
    Spinner
} from '@phosphor-icons/react'

interface ImportClientsModalProps {
    isOpen: boolean
    onClose: () => void
    onImportComplete?: (count: number) => void
}

interface ParsedClient {
    firstName: string
    lastName: string
    dateOfBirth: string
    phone: string
    email: string
    isValid: boolean
    errors: string[]
}

export default function ImportClientsModal({ isOpen, onClose, onImportComplete }: ImportClientsModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [parsedClients, setParsedClients] = useState<ParsedClient[]>([])
    const [isImporting, setIsImporting] = useState(false)
    const [importComplete, setImportComplete] = useState(false)
    const [importResults, setImportResults] = useState({ success: 0, errors: 0 })
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            parseCSV(selectedFile)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && droppedFile.type === 'text/csv') {
            setFile(droppedFile)
            parseCSV(droppedFile)
        }
    }

    const parseCSV = (file: File) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const text = e.target?.result as string
            const lines = text.split('\n').filter(line => line.trim())

            // Skip header row
            const dataLines = lines.slice(1)

            const clients: ParsedClient[] = dataLines.map(line => {
                const cols = line.split(',').map(col => col.trim().replace(/"/g, ''))
                const [firstName, lastName, dateOfBirth, phone, email] = cols

                const errors: string[] = []
                if (!firstName) errors.push('First name required')
                if (!lastName) errors.push('Last name required')
                if (!dateOfBirth) errors.push('DOB required')

                return {
                    firstName: firstName || '',
                    lastName: lastName || '',
                    dateOfBirth: dateOfBirth || '',
                    phone: phone || '',
                    email: email || '',
                    isValid: errors.length === 0,
                    errors
                }
            })

            setParsedClients(clients)
        }
        reader.readAsText(file)
    }

    const handleImport = async () => {
        setIsImporting(true)

        // Simulate import process
        await new Promise(resolve => setTimeout(resolve, 2000))

        const validClients = parsedClients.filter(c => c.isValid)
        const invalidClients = parsedClients.filter(c => !c.isValid)

        setImportResults({
            success: validClients.length,
            errors: invalidClients.length
        })

        setIsImporting(false)
        setImportComplete(true)

        if (onImportComplete) {
            onImportComplete(validClients.length)
        }
    }

    const handleClose = () => {
        // Reset state
        setFile(null)
        setParsedClients([])
        setIsImporting(false)
        setImportComplete(false)
        setImportResults({ success: 0, errors: 0 })
        onClose()
    }

    const downloadTemplate = () => {
        const template = 'First Name,Last Name,Date of Birth,Phone,Email\nJohn,Doe,1990-01-15,(555) 123-4567,john.doe@email.com\nJane,Smith,1985-06-20,(555) 987-6543,jane.smith@email.com'
        const blob = new Blob([template], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'client_import_template.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    const validCount = parsedClients.filter(c => c.isValid).length
    const errorCount = parsedClients.filter(c => !c.isValid).length

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Import Clients" size="lg">
            {!importComplete ? (
                <div className="import-modal">
                    {/* Template Download */}
                    <div className="import-template-banner">
                        <FileText size={24} weight="duotone" />
                        <div>
                            <p className="template-title">Need a template?</p>
                            <p className="template-desc">Download our CSV template with the correct column format</p>
                        </div>
                        <button className="btn-secondary btn-sm" onClick={downloadTemplate}>
                            <DownloadSimple size={16} weight="bold" />
                            Download Template
                        </button>
                    </div>

                    {/* Upload Zone */}
                    {!file && (
                        <div
                            className="upload-dropzone"
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <UploadSimple size={48} weight="duotone" className="upload-icon" />
                            <p className="upload-text">Drag & drop your CSV file here</p>
                            <p className="upload-subtext">or click to browse</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleFileSelect}
                                className="upload-input"
                            />
                        </div>
                    )}

                    {/* File Selected */}
                    {file && !isImporting && (
                        <>
                            <div className="import-file-info">
                                <FileText size={24} weight="duotone" />
                                <div>
                                    <p className="file-name">{file.name}</p>
                                    <p className="file-size">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <button className="btn-ghost btn-sm" onClick={() => { setFile(null); setParsedClients([]) }}>
                                    Remove
                                </button>
                            </div>

                            {/* Preview Table */}
                            {parsedClients.length > 0 && (
                                <>
                                    <div className="import-summary">
                                        <span className="summary-item success">
                                            <CheckCircle size={18} weight="fill" />
                                            {validCount} Valid
                                        </span>
                                        {errorCount > 0 && (
                                            <span className="summary-item error">
                                                <XCircle size={18} weight="fill" />
                                                {errorCount} Errors
                                            </span>
                                        )}
                                    </div>

                                    <div className="import-preview">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Status</th>
                                                    <th>First Name</th>
                                                    <th>Last Name</th>
                                                    <th>Date of Birth</th>
                                                    <th>Phone</th>
                                                    <th>Email</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parsedClients.slice(0, 10).map((client, idx) => (
                                                    <tr key={idx} className={client.isValid ? '' : 'error-row'}>
                                                        <td>
                                                            {client.isValid ? (
                                                                <CheckCircle size={18} weight="fill" className="text-green" />
                                                            ) : (
                                                                <XCircle size={18} weight="fill" className="text-red" />
                                                            )}
                                                        </td>
                                                        <td>{client.firstName || <span className="text-muted">-</span>}</td>
                                                        <td>{client.lastName || <span className="text-muted">-</span>}</td>
                                                        <td>{client.dateOfBirth || <span className="text-muted">-</span>}</td>
                                                        <td>{client.phone || <span className="text-muted">-</span>}</td>
                                                        <td>{client.email || <span className="text-muted">-</span>}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {parsedClients.length > 10 && (
                                            <p className="preview-more">
                                                And {parsedClients.length - 10} more...
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="form-actions">
                                <button className="btn-secondary" onClick={handleClose}>Cancel</button>
                                <button
                                    className="btn-primary"
                                    onClick={handleImport}
                                    disabled={validCount === 0}
                                >
                                    Import {validCount} Client{validCount !== 1 ? 's' : ''}
                                </button>
                            </div>
                        </>
                    )}

                    {/* Importing */}
                    {isImporting && (
                        <div className="import-progress">
                            <Spinner size={48} className="spin" />
                            <p>Importing clients...</p>
                        </div>
                    )}
                </div>
            ) : (
                /* Import Complete */
                <div className="import-complete">
                    <CheckCircle size={64} weight="duotone" className="text-green" />
                    <h3>Import Complete!</h3>
                    <p>{importResults.success} client{importResults.success !== 1 ? 's' : ''} imported successfully</p>
                    {importResults.errors > 0 && (
                        <p className="error-note">
                            <Warning size={16} weight="fill" />
                            {importResults.errors} row{importResults.errors !== 1 ? 's' : ''} skipped due to errors
                        </p>
                    )}
                    <button className="btn-primary" onClick={handleClose}>
                        Done
                    </button>
                </div>
            )}
        </Modal>
    )
}
