<script setup lang="ts">
import { computed, nextTick, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUnsaved } from "@/shared/public";
import {
  CellText,
  DataTable,
  DescriptionList,
  Field,
  FilterItem,
  PageFrame,
  Row,
  Stack,
  StatusLine,
  Timeline,
  UiButton,
  UiDialog,
  UiAccordion,
  UiDrawer,
  UiEmpty,
  UiInput,
  UiSearchInput,
  UiSelect,
  UiTag,
  useToast,
  type SortState,
} from "@/shared/ui/public";

import {
  createCustomers,
  statuses,
  industries,
  statusLabel,
  statusTone,
  industryLabel,
  columns,
  type Customer,
  type Industry,
} from "./customer-data";

const customers = ref(createCustomers());
const route = useRoute();
const router = useRouter();
const toast = useToast();
const pageSizes = [10, 15, 25];
interface Filters {
  search: string;
  status: string;
  page: number;
  pageSize: number;
  sort: SortState | null;
}
function queryText(key: string): string {
  const value = route.query[`customer_${key}`];
  return typeof value === "string" ? value : "";
}
const filters = computed<Filters>(() => {
  const rawPage = Number(queryText("page"));
  const rawSize = Number(queryText("size"));
  const rawSort = queryText("sort");
  const rawDirection = queryText("direction");
  return {
    search: queryText("search").slice(0, 120),
    status: statuses.some((item) => item.value === queryText("status"))
      ? queryText("status")
      : "",
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: pageSizes.includes(rawSize) ? rawSize : 15,
    sort:
      rawSort === "none"
        ? null
        : {
            key: rawSort === "company" ? "company" : "updated",
            dir: rawDirection === "asc" ? "asc" : "desc",
          },
  };
});

function setFilters(patch: Partial<Filters>) {
  const value = { ...filters.value, ...patch };
  const query = { ...route.query };
  for (const key of ["search", "status", "page", "size", "sort", "direction"])
    delete query[`customer_${key}`];
  if (value.search) query.customer_search = value.search;
  if (value.status) query.customer_status = value.status;
  if (value.page > 1) query.customer_page = String(value.page);
  if (value.pageSize !== 15) query.customer_size = String(value.pageSize);
  if (!value.sort) query.customer_sort = "none";
  else if (value.sort.key !== "updated" || value.sort.dir !== "desc") {
    query.customer_sort = value.sort.key;
    query.customer_direction = value.sort.dir;
  }
  return router.replace({ query });
}
const search = computed({
  get: () => filters.value.search,
  set: (value: string) => {
    void setFilters({ search: value, page: 1 });
  },
});
const status = computed({
  get: () => filters.value.status,
  set: (value: string) => {
    void setFilters({ status: value, page: 1 });
  },
});
const pageSize = computed({
  get: () => filters.value.pageSize,
  set: (value: number) => {
    void setFilters({ pageSize: value, page: 1 });
  },
});
const sort = computed({
  get: () => filters.value.sort,
  set: (value: SortState | null) => {
    void setFilters({ sort: value, page: 1 });
  },
});
const filtered = computed(() => {
  const needle = search.value.trim().toLocaleLowerCase("zh-CN");
  return customers.value.filter(
    (customer) =>
      (!status.value || customer.status === status.value) &&
      (!needle ||
        [customer.company, customer.contact, customer.phone].some((value) =>
          value.toLocaleLowerCase("zh-CN").includes(needle),
        )),
  );
});
const sorted = computed(() => {
  if (!sort.value) return filtered.value;
  const { key, dir } = sort.value;
  return [...filtered.value].sort(
    (a, b) =>
      a[key as "company" | "updated"].localeCompare(
        b[key as "company" | "updated"],
        "zh-CN",
      ) * (dir === "asc" ? 1 : -1),
  );
});
const page = computed({
  get: () =>
    Math.min(
      filters.value.page,
      Math.max(1, Math.ceil(filtered.value.length / pageSize.value)),
    ),
  set: (value: number) => {
    void setFilters({ page: value });
  },
});
const rows = computed(() =>
  sorted.value.slice(
    (page.value - 1) * pageSize.value,
    page.value * pageSize.value,
  ),
);
function resetFilters() {
  void setFilters({ search: "", status: "", page: 1 });
}

const createOpen = ref(false);
const discardOpen = ref(false);
const submitted = ref(false);
const newForm = ref<HTMLFormElement>();
const blankDraft = () => ({
  company: "",
  contact: "",
  phone: "",
  industry: "technology",
  city: "",
});
const draft = reactive(blankDraft());
const dirty = computed(() =>
  Object.entries(blankDraft()).some(
    ([key, value]) => draft[key as keyof typeof draft] !== value,
  ),
);
useUnsaved(dirty, "客户信息尚未添加。确认离开吗？");
const errors = computed(() => ({
  company:
    draft.company.trim().length < 2 || draft.company.trim().length > 80
      ? "请输入 2–80 个字的客户名称"
      : "",
  contact:
    draft.contact.trim().length < 2 || draft.contact.trim().length > 30
      ? "请输入 2–30 个字的联系人姓名"
      : "",
  phone: /^1[3-9]\d{9}$/.test(draft.phone.trim())
    ? ""
    : "请输入 11 位中国大陆手机号",
  city: draft.city.trim().length > 20 ? "城市名称不能超过 20 个字" : "",
}));
function startCreate() {
  Object.assign(draft, blankDraft());
  submitted.value = false;
  createOpen.value = true;
}
function requestCreateOpen(open: boolean) {
  if (!open && dirty.value) discardOpen.value = true;
  else createOpen.value = open;
}
function discardDraft() {
  discardOpen.value = false;
  createOpen.value = false;
  Object.assign(draft, blankDraft());
}

async function createCustomer() {
  if (!createOpen.value) return;
  submitted.value = true;
  if (Object.values(errors.value).some(Boolean)) {
    await nextTick();
    newForm.value?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    return;
  }
  const today = new Date().toLocaleDateString("sv-SE");
  const customer: Customer = {
    id: `KH-${1001 + customers.value.length}`,
    company: draft.company.trim(),
    contact: draft.contact.trim(),
    phone: draft.phone.trim(),
    industry: draft.industry as Industry,
    city: draft.city.trim() || "未填写",
    status: "prospect",
    owner: "林晓",
    created: today,
    updated: today,
  };
  customers.value.unshift(customer);
  createOpen.value = false;
  Object.assign(draft, blankDraft());
  await setFilters({
    search: "",
    status: "",
    page: 1,
    sort: { key: "updated", dir: "desc" },
  });
  toast.success(`已添加 ${customer.company}，仅本次演示保留`);
}
const detailOpen = ref(false);
const inspected = ref<Customer>();
function inspect(customer: Customer) {
  inspected.value = customer;
  detailOpen.value = true;
}
const details = computed(() =>
  inspected.value
    ? [
        { label: "客户编号", value: inspected.value.id },
        { label: "联系人", value: inspected.value.contact },
        { label: "联系电话", value: inspected.value.phone },
        { label: "所属行业", value: industryLabel(inspected.value.industry) },
        { label: "所在城市", value: inspected.value.city },
        { label: "负责人", value: inspected.value.owner },
        { label: "创建日期", value: inspected.value.created },
        { label: "最近更新", value: inspected.value.updated },
      ]
    : [],
);
</script>

<template>
  <PageFrame title="客户管理" workspace>
    <template #actions
      ><UiButton variant="primary" icon="plus" @click="startCreate"
        >新建客户</UiButton
      ></template
    >
    <template #status
      ><StatusLine
        :items="[
          { text: '本地演示 · 刷新后还原' },
          { text: `共 ${customers.length} 位客户` },
        ]"
    /></template>
    <DataTable
      fill
      flat
      server-sort
      v-model:sort="sort"
      v-model:page="page"
      v-model:page-size="pageSize"
      :columns="columns"
      :rows="rows"
      row-key="id"
      :total="filtered.length"
      :sizes="pageSizes"
      :scroll-key="route.fullPath"
    >
      <template #search>
        <Row>
          <FilterItem size="lg"
            ><UiSearchInput
              v-model="search"
              placeholder="搜索客户、联系人或手机号"
              aria-label="搜索客户、联系人或手机号"
          /></FilterItem>
          <FilterItem size="sm"
            ><UiSelect
              v-model="status"
              :options="statuses"
              aria-label="合作状态"
          /></FilterItem>
          <UiButton
            v-if="search || status"
            variant="ghost"
            size="sm"
            @click="resetFilters"
            >清除筛选</UiButton
          >
        </Row>
      </template>
      <template #cell-company="{ row }"
        ><UiButton
          variant="text"
          :aria-label="`查看${row.company}`"
          @click="inspect(row)"
          >{{ row.company }}</UiButton
        ></template
      >
      <template #cell-contact="{ row }"
        ><CellText :title="row.contact">{{ row.phone }}</CellText></template
      >
      <template #cell-industry="{ row }">{{
        industryLabel(row.industry)
      }}</template>
      <template #cell-status="{ row }"
        ><UiTag :tone="statusTone(row.status)" dot>{{
          statusLabel(row.status)
        }}</UiTag></template
      >
      <template #empty
        ><UiEmpty
          title="没有符合条件的客户"
          hint="换个关键词，或清除筛选重新查找。"
          ><UiButton @click="resetFilters">清除筛选</UiButton></UiEmpty
        ></template
      >
    </DataTable>
  </PageFrame>

  <UiDialog
    :open="createOpen"
    @update:open="requestCreateOpen"
    title="新建客户"
    description="记录仅在本次演示中保留，刷新后还原。"
  >
    <form
      id="customer-create-form"
      ref="newForm"
      aria-label="新建客户"
      novalidate
      @submit.prevent="createCustomer"
    >
      <Stack>
        <Field
          label="客户名称"
          required
          :error="submitted ? errors.company : undefined"
          ><UiInput
            v-model="draft.company"
            placeholder="如：云杉数字科技"
            autocomplete="organization"
            maxlength="80"
        /></Field>
        <Field
          label="联系人"
          required
          :error="submitted ? errors.contact : undefined"
          ><UiInput
            v-model="draft.contact"
            placeholder="联系人姓名"
            autocomplete="name"
            maxlength="30"
        /></Field>
        <Field
          label="手机号"
          required
          :error="submitted ? errors.phone : undefined"
          ><UiInput
            v-model="draft.phone"
            placeholder="11 位中国大陆手机号"
            inputmode="tel"
            autocomplete="tel"
            maxlength="11"
        /></Field>
        <Field label="所属行业"
          ><UiSelect v-model="draft.industry" :options="industries"
        /></Field>
        <Field label="所在城市" :error="submitted ? errors.city : undefined"
          ><UiInput
            v-model="draft.city"
            placeholder="选填"
            autocomplete="address-level2"
            maxlength="20"
        /></Field>
      </Stack>
    </form>
    <template #footer>
      <UiButton variant="ghost" @click="requestCreateOpen(false)"
        >取消</UiButton
      >
      <UiButton variant="primary" type="submit" form="customer-create-form"
        >添加客户</UiButton
      >
    </template>
  </UiDialog>
  <UiDialog
    v-model:open="discardOpen"
    title="放弃未添加的客户？"
    description="已填写的内容会被清除。"
  >
    <template #footer
      ><UiButton @click="discardOpen = false">继续填写</UiButton
      ><UiButton variant="danger" @click="discardDraft"
        >放弃填写</UiButton
      ></template
    >
  </UiDialog>
  <UiDrawer v-model:open="detailOpen" :title="inspected?.company ?? '客户详情'">
    <Stack v-if="inspected" gap="lg">
      <Row
        ><UiTag :tone="statusTone(inspected.status)" dot>{{
          statusLabel(inspected.status)
        }}</UiTag
        ><UiTag tone="neutral">{{
          industryLabel(inspected.industry)
        }}</UiTag></Row
      >
      <DescriptionList :items="details" />
      <UiAccordion :items="[{ value: 'history', title: '资料记录' }]"
        ><template #item-history>
          <Timeline
            :items="
              inspected.created === inspected.updated
                ? [
                    {
                      title: `创建客户资料 · ${inspected.owner}`,
                      time: inspected.created,
                    },
                  ]
                : [
                    {
                      title: `更新客户资料 · ${inspected.owner}`,
                      time: inspected.updated,
                    },
                    { title: '创建客户资料', time: inspected.created },
                  ]
            "
          /> </template
      ></UiAccordion>
    </Stack>
    <template #footer
      ><UiButton @click="detailOpen = false">关闭详情</UiButton></template
    >
  </UiDrawer>
</template>
