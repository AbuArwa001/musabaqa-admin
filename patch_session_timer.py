import re

with open("components/SessionTimer.tsx", "r") as f:
    content = f.read()

# Add createPortal import
content = content.replace("import { useRouter } from 'next/navigation'",
                          "import { useRouter } from 'next/navigation'\nimport { createPortal } from 'react-dom'")

# Use createPortal
old_modal = """      {/* ─── 2. Ultra-Premium Session Expiry Warning Modal (< 1 minute) ─── */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">"""

new_modal = """      {/* ─── 2. Ultra-Premium Session Expiry Warning Modal (< 1 minute) ─── */}
      {showWarningModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">"""

content = content.replace(old_modal, new_modal)

# Close the portal
old_end = """      )}
    </>
  )
}"""

new_end = """      ), document.body)}
    </>
  )
}"""
content = content.replace(old_end, new_end)

with open("components/SessionTimer.tsx", "w") as f:
    f.write(content)
