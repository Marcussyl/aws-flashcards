'use client'

import { useState } from 'react'

type StudyTaskCheckboxProps = {
  defaultChecked?: boolean
  className?: string
}

/**
 * Local-only task checkbox for study / edit-preview markdown.
 * Toggles in-memory; does not persist to the card document.
 */
export function StudyTaskCheckbox({
  defaultChecked = false,
  className,
}: StudyTaskCheckboxProps) {
  const [checked, setChecked] = useState(Boolean(defaultChecked))

  return (
    <input
      type="checkbox"
      className={[
        'memori-task-checkbox',
        checked ? 'memori-task-checkbox--checked' : 'memori-task-checkbox--unchecked',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      checked={checked}
      onChange={() => setChecked((value) => !value)}
      aria-checked={checked}
    />
  )
}
