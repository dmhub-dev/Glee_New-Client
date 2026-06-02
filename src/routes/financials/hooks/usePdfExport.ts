import { useEffect, useState } from 'react'

export function usePdfExport() {
  const [exportingPdf, setExportingPdf] = useState(false)

  useEffect(() => {
    function handleAfterPrint() {
      document.documentElement.removeAttribute('data-exporting-pdf')
      setExportingPdf(false)
    }

    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  function handleExportPdf() {
    if (exportingPdf) return
    setExportingPdf(true)
    document.documentElement.setAttribute('data-exporting-pdf', 'true')
    setTimeout(() => window.print(), 50)
  }

  return { exportingPdf, handleExportPdf }
}
