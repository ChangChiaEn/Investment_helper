'use client'

import {
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { maskText } from '@/config/disguise'

/** 擴充 Text，記住 React 寫入的原文以便開關偽裝時還原 */
type MaskableText = Text & { __disguiseOriginal?: string }

/** 擴充元素，記住需遮罩的屬性原文 */
type MaskableElement = HTMLElement & {
  __disguiseAttrs?: Record<string, string>
}

/** 需一併遮罩的屬性（placeholder 等不在文字節點內） */
const MASK_ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const

/**
 * 包裹主內容區：偽裝開啟時以詞彙表改寫可見文字與常見屬性。
 * 關閉時還原。動態插入的節點由 MutationObserver 處理。
 * 標記 data-no-disguise 的子樹會跳過。
 * @param children 主內容
 */
export function DisguiseTextWalker({ children }: { children: ReactNode }) {
  const { disguise } = useTheme()
  const rootRef = useRef<HTMLDivElement>(null)
  const applyingRef = useRef(false)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    /**
     * 走訪文字節點與屬性並套用／還原遮罩。
     */
    const applyMask = () => {
      if (applyingRef.current) return
      applyingRef.current = true
      try {
        // --- 文字節點 ---
        const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const parent = node.parentElement
            if (!parent) return NodeFilter.FILTER_REJECT
            if (parent.closest('[data-no-disguise]')) {
              return NodeFilter.FILTER_REJECT
            }
            const tag = parent.tagName
            if (
              tag === 'SCRIPT' ||
              tag === 'STYLE' ||
              tag === 'NOSCRIPT' ||
              tag === 'TEXTAREA' ||
              tag === 'CODE' ||
              tag === 'PRE'
            ) {
              return NodeFilter.FILTER_REJECT
            }
            return NodeFilter.FILTER_ACCEPT
          },
        })

        let textCurrent = textWalker.nextNode()
        while (textCurrent) {
          const textNode = textCurrent as MaskableText
          if (textNode.__disguiseOriginal === undefined) {
            textNode.__disguiseOriginal = textNode.textContent ?? ''
          }
          const original = textNode.__disguiseOriginal
          const next = disguise ? maskText(original, true) : original
          if (textNode.textContent !== next) {
            textNode.textContent = next
          }
          textCurrent = textWalker.nextNode()
        }

        // --- 元素屬性（placeholder / title / aria-label / alt）---
        const elements = root.querySelectorAll<HTMLElement>(
          'input, textarea, select, button, a, img, [title], [aria-label], [placeholder]',
        )
        elements.forEach((el) => {
          if (el.closest('[data-no-disguise]')) return
          const maskable = el as MaskableElement
          if (!maskable.__disguiseAttrs) {
            maskable.__disguiseAttrs = {}
          }
          for (const attr of MASK_ATTRS) {
            if (!el.hasAttribute(attr)) continue
            if (maskable.__disguiseAttrs[attr] === undefined) {
              maskable.__disguiseAttrs[attr] = el.getAttribute(attr) ?? ''
            }
            const original = maskable.__disguiseAttrs[attr]
            const next = disguise ? maskText(original, true) : original
            if (el.getAttribute(attr) !== next) {
              el.setAttribute(attr, next)
            }
          }
        })
      } finally {
        applyingRef.current = false
      }
    }

    applyMask()

    const observer = new MutationObserver(() => {
      if (applyingRef.current) return
      applyMask()
    })
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...MASK_ATTRS],
    })

    return () => observer.disconnect()
  }, [disguise])

  return (
    <div ref={rootRef} className="contents">
      {children}
    </div>
  )
}
