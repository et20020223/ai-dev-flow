---
name: ai-flow
description: Coordinate requirements, implementation, review, and cross-tool handoffs for development tasks in this repository. Use when starting a requirement, resuming a task, or handing work to another AI.
---

# AI Dev Flow

當使用者要求開始需求、釐清需求、接續任務、交接或審查任務時，讀取 repository 根目錄的 `.ai-flow/WORKFLOW.md` 並按其路由處理。共用背景在 `.ai-flow/PROJECT.md`，任務在 `.ai-flow/tasks/<id>/TASK.md`。普通問答不用啟動完整流程。多個入口同時載入時只執行一次。若無法找到 repository 根目錄，先定位包含 `.ai-flow/WORKFLOW.md` 的專案根目錄。
