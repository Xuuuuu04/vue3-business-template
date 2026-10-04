/** 图由实际登记内容导出；前端页面和命令行使用相同的数据结构。 */
import type { BusinessModule } from "./definitions";
import { sourceOf } from "@/shared/records/store";
export function describe(modules: BusinessModule[]) {
  return modules.map((module) => ({
    name: module.name,
    title: module.title,
    description: module.description,
    dependsOn: module.dependsOn,
    source: `src/modules/${module.name}/module.ts`,
    files: module.files,
    pages: module.pages.map(
      ({ id, title, path, file, actions, components }) => ({
        id,
        title,
        path,
        file: `src/modules/${module.name}/${file}`,
        actions,
        components,
        state: `src/modules/${module.name}/state.ts`,
      }),
    ),
    endpoints: module.endpoints.map(
      ({ id, title, method, path, responseKind }) => ({
        id,
        title,
        method,
        path,
        responseKind,
      }),
    ),
    actions: module.actions.map((action) => ({
      id: action.id,
      title: action.title,
      inputFields: action.inputFields,
      result: action.result,
      fields: Object.fromEntries(
        Object.entries(action.fields).map(([key, field]) => [
          key,
          { title: field.title, secret: !!field.secret },
        ]),
      ),
      steps: action.steps.map((step) => ({
        id: step.id,
        title: step.title,
        rule: step.rule,
        reads: step.reads,
        writes: step.writes,
        uses: step.uses,
        when: step.when
          ? { id: step.when.id, title: step.when.title, reads: step.when.reads }
          : undefined,
        source: sourceOf(step.id),
      })),
    })),
  }));
}
