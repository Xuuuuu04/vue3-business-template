# 组件尺寸与操作规范

用于修改公共组件与布局。具体数值是本模板的选择；WCAG 要求与设计系统建议分别理解。

## 间距、字体与分隔

| 内容 | 本模板选择 |
| --- | --- |
| 细节 | 4px；图标与文字通常 8px |
| 相邻操作 | 8px；工具条分组 12px |
| 内容组合 | 16px；不同区块 24px；大范围分组 32px |
| 页面边距 | 桌面 24px，手机 16px |
| 字体与行高 | 正文、输入值 16/24；字段名称、导航 14/20；帮助 13/20；标注 12/16 |
| 单行数据 | 紧凑 44px、宽松 48px；行内按钮不能增加实际行高 |

相邻 FormSection 放进 Stack gap="none"，分隔线两侧由区块各保留 24px。不要再给外层增加相同的组间距。线只表达区域边界，不逐个字段加框；先用留白组织，再判断是否需要分隔线。

主区使用剩余宽高，工具条和分页保持可操作。只有长表体、文档和长内容内部滚动；表单最大行宽 760px，不能用扩大空框或增加无关面板填屏。

字体随包提供，等待 fonts.ready 后比较；中文系统字体也要检查。不要缩小正文来增加屏幕填充，也不要靠加粗所有文字制造层级。

普通文字、辅助文字和占位文字至少 4.5:1，不能因为写成小字就放宽到 3:1。更换色阶要运行所有配色、明暗与侧栏组合的文字对比度检查。

## 操作与动效

动效时长统一在 tokens.css：轻反馈 110ms、小位移 150ms、侧栏与抽屉 240ms。使用公共曲线，不额外弹跳、逐项飞入、滚动数字或延迟显示真实数据。入场与离场对应；弹窗的居中位置与动画位移分别处理。减少动态效果时缩短位移，持续动画只播放一次，状态仍能静态识别。

拖动必须有非拖动的点击替代入口，键盘替代还要另外检查。文件选择允许点击原生选择器；色相滑条允许点轨道、拖动和方向键。拖入反馈只对文件出现，经过内部图标或文字不闪烁；禁用、处理中与结果未知时不能替换或移除待确认文件。

视觉图形与点击区域可以不同。复选框图形 16px、点击区域至少 24px；色相轨道 8px、操作高度 32px。小图标不得缩小实际可点击范围。窄屏弹层保留至少 12px 两侧空间。

## 参考与边界

- [Carbon 间距](https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview)：使用有层级的统一刻度，支持细节与页面分组。
- [Carbon 字体](https://www.carbondesignsystem.com/building-blocks/foundations/typography/overview)：产品内容按任务设置字号、字重与行高。
- [Carbon 动效](https://www.carbondesignsystem.com/building-blocks/foundations/motion/overview)：操作反馈轻快，时长按变化规模选择；本模板只采用适合后台的几个档位。
- [WCAG 2.5.7 拖动](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)：提供不用拖动的单指针方式，键盘支持不能单独代替这一项。
- [WCAG 2.5.8 点击目标](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)：AA 通常为 24×24 CSS px，也有间距、等效操作、行内等例外；44px 是更高要求，不是所有控件的统一 AA 下限。
- [WCAG 1.4.3 文字对比](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)：普通文字、提示与占位文字至少 4.5:1；大字和非活动控件等有各自的例外。

以上是相关项目检查范围，不代表整个产品已经完成 WCAG 合规评估。最后仍按 visual-review.md 比较实际画面并操作相关任务。
