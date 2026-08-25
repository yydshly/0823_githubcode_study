# HyperFrames 最新 CLI 兼容性

- CLI：`0.8.10`
- 入口：25
- 零错误兼容：11
- 存在兼容错误：14
- 合计：115 errors / 163 warnings

| 入口 | 状态 | Errors | Warnings | 主要发现 |
| --- | --- | ---: | ---: | --- |
| `HF-heygen-stripe` | 需迁移 | 2 | 1 | gsap_timeline_set_initial_hide、font_family_without_font_face、gsap_non_transform_motion |
| `claude-design-send-hyperframes-launch` | 兼容 | 0 | 10 | overlapping_gsap_tweens、composition_file_too_large、duplicate_media_discovery_risk |
| `claude-paper-launch` | 需迁移 | 13 | 5 | gsap_timeline_set_initial_hide、composition_file_too_large、audio_src_not_found、missing_local_asset、gsap_non_transform_motion、overlapping_gsap_tweens |
| `cloud-render-launch` | 需迁移 | 5 | 2 | gsap_timeline_set_initial_hide、gsap_non_transform_motion、overlapping_gsap_tweens |
| `figma-launch` | 需迁移 | 1 | 0 | gsap_function_value_hazard |
| `frame-md-launch-storyboard` | 需迁移 | 19 | 0 | font_family_without_font_face、subcomposition_root_styled_by_class、gsap_non_transform_motion、invalid_parent_traversal_in_asset_path |
| `hyperframes-launch` | 需迁移 | 8 | 32 | studio_missing_editable_id、composition_file_too_large、invalid_parent_traversal_in_asset_path、overlapping_gsap_tweens、gsap_exit_missing_hard_kill、gsap_animates_clip_element、gsap_non_transform_motion、gsap_timeline_set_initial_hide、font_family_without_font_face |
| `inspector-launch` | 需迁移 | 14 | 15 | overlapping_gsap_tweens、gsap_exit_missing_hard_kill、gsap_css_transform_conflict、gsap_non_transform_motion、composition_file_too_large、timeline_track_too_dense、font_family_without_font_face |
| `k3-promo` | 兼容 | 0 | 1 | composition_file_too_large |
| `liquid-brand-refraction` | 兼容 | 0 | 0 | — |
| `pr-to-video-launch` | 需迁移 | 12 | 2 | gsap_timeline_set_initial_hide、invalid_parent_traversal_in_asset_path、gsap_non_transform_motion、duplicate_media_discovery_risk |
| `sfx-music-launch` | 需迁移 | 7 | 8 | gsap_timeline_set_initial_hide、gsap_non_transform_motion |
| `spacex-launch` | 需迁移 | 13 | 2 | gsap_timeline_set_initial_hide、gsap_non_transform_motion、composition_file_too_large |
| `texture-launch-video` | 需迁移 | 2 | 1 | gsap_css_transform_conflict、composition_file_too_large、font_family_without_font_face |
| `timeline-launch` | 需迁移 | 3 | 5 | gsap_callback_dom_measurement、composition_file_too_large、font_family_without_font_face、gsap_timeline_set_initial_hide、gsap_css_transform_conflict、duplicate_media_discovery_risk |
| `variables-launch` | 需迁移 | 11 | 20 | studio_missing_editable_id、media_missing_id、invalid_parent_traversal_in_asset_path、imperative_media_control、overlapping_gsap_tweens、gsap_relative_value_second_writer |
| `vfx-heygen-combined` | 需迁移 | 5 | 14 | overlapping_gsap_tweens、gsap_non_transform_motion、composition_file_too_large、subcomposition_blanks_before_host、font_family_without_font_face、missing_local_asset、gsap_callback_dom_measurement、gsap_timeline_set_initial_hide |
| `website-to-hyperframes` | 兼容 | 0 | 31 | studio_missing_editable_id、composition_heavy_overlay_count_high、overlapping_gsap_tweens、composition_file_too_large |
| `heygen-apple-motion/01-ui-sting` | 兼容 | 0 | 3 | duplicate_media_discovery_risk、composition_file_too_large、timeline_track_too_dense |
| `heygen-apple-motion/02-bouncy-ui` | 兼容 | 0 | 1 | composition_file_too_large |
| `heygen-apple-motion/03-message-sting` | 兼容 | 0 | 2 | duplicate_media_discovery_risk、composition_file_too_large |
| `heygen-apple-motion/04-generate-reel` | 兼容 | 0 | 1 | composition_file_too_large |
| `heygen-apple-motion/examples/instagram` | 兼容 | 0 | 3 | duplicate_media_discovery_risk、composition_file_too_large、timeline_track_too_dense |
| `heygen-apple-motion/examples/spotify` | 兼容 | 0 | 3 | duplicate_media_discovery_risk、composition_file_too_large、timeline_track_too_dense |
| `heygen-apple-motion/hero` | 兼容 | 0 | 1 | timeline_track_too_dense |

> “需迁移”表示案例源码与当前 CLI 的规则存在差异，不表示上游发布视频无效。上游案例来自多个制作时期，部分 package.json 锁定了旧版 CLI。
