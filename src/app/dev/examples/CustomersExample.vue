<script setup lang="ts">
/** 客户管理演示：筛选与分页保留在地址中；新增记录只在本次页面内存中保留。 */
import { computed, nextTick, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUnsaved } from "@/shared/public";
import {
  CellText, DataTable, DescriptionList, Field, FilterItem,
  PageFrame, Row, Stack, StatusLine, Timeline, UiButton, UiDialog,
  UiAccordion, UiDrawer, UiEmpty, UiInput, UiSearchInput, UiSelect, UiTag, useToast,
  type DataColumn, type SortState,
} from "@/shared/ui/public";

type CustomerStatus = "active" | "prospect" | "paused";
type Industry = "technology" | "retail" | "design" | "manufacturing" | "services";
interface Customer {
  id: string;
  company: string;
  contact: string;
  phone: string;
  industry: Industry;
  city: string;
  status: CustomerStatus;
  owner: string;
  created: string;
  updated: string;
}
type CustomerSeed = [string, string, string, Industry, string, CustomerStatus, string, string];
const seeds: CustomerSeed[] = [
  ["云杉数字科技", "顾思远", "13800000001", "technology", "杭州", "active", "林晓", "2026-10-07"],
  ["星河零售集团", "许知夏", "13800000002", "retail", "上海", "active", "周宁", "2026-10-07"],
  ["江南设计事务所", "沈亦舟", "13800000003", "design", "苏州", "prospect", "林晓", "2026-10-06"],
  ["远望工业设备", "何嘉树", "13800000004", "manufacturing", "宁波", "active", "陈可", "2026-10-06"],
  ["青禾生活用品", "陆清和", "13800000005", "retail", "成都", "prospect", "周宁", "2026-10-06"],
  ["启明企业服务", "梁以安", "13800000006", "services", "北京", "active", "陈可", "2026-10-05"],
  ["见山建筑设计", "林若溪", "13800000007", "design", "深圳", "active", "林晓", "2026-10-05"],
  ["万里精密制造", "程星野", "13800000008", "manufacturing", "东莞", "paused", "周宁", "2026-10-04"],
  ["松果软件工作室", "赵语桐", "13800000009", "technology", "武汉", "prospect", "林晓", "2026-10-04"],
  ["北辰供应链管理", "宋知行", "13800000010", "services", "天津", "active", "陈可", "2026-10-03"],
  ["白鹭文创商店", "唐予安", "13800000011", "retail", "厦门", "active", "周宁", "2026-10-03"],
  ["海川智能科技", "叶书言", "13800000012", "technology", "南京", "prospect", "陈可", "2026-10-02"],
  ["拾光品牌设计", "徐南乔", "13800000013", "design", "广州", "active", "林晓", "2026-10-02"],
  ["山海商业管理", "韩景初", "13800000014", "services", "重庆", "paused", "周宁", "2026-10-01"],
  ["瑞泽医疗设备", "方遇之", "13800000015", "manufacturing", "合肥", "active", "陈可", "2026-09-30"],
  ["梧桐城市服务", "吴初晴", "13800000016", "services", "长沙", "prospect", "林晓", "2026-09-30"],
  ["新叶连锁书店", "朱子墨", "13800000017", "retail", "济南", "active", "周宁", "2026-09-29"],
  ["观澜空间设计", "郑雨辰", "13800000018", "design", "佛山", "prospect", "陈可", "2026-09-29"],
  ["安拓自动化技术", "邓一川", "13800000019", "manufacturing", "无锡", "active", "林晓", "2026-09-28"],
  ["墨泉数据服务", "彭星澄", "13800000020", "technology", "西安", "paused", "周宁", "2026-09-27"],
];
const customers = ref<Customer[]>(seeds.map(([company, contact, phone, industry, city, status, owner, updated], index) => ({
  id: `KH-${String(1001 + index)}`, company, contact, phone, industry, city, status, owner,
  created: "2026-07-16", updated,
})));
const statuses = [
  { value: "", label: "全部状态" },
  { value: "active", label: "合作中" },
  { value: "prospect", label: "洽谈中" },
  { value: "paused", label: "暂停合作" },
];
const industries = [
  { value: "technology", label: "信息技术" },
  { value: "retail", label: "零售消费" },
  { value: "design", label: "设计创意" },
  { value: "manufacturing", label: "工业制造" },
  { value: "services", label: "企业服务" },
];
const statusLabel = (status: CustomerStatus) => statuses.find((item) => item.value === status)!.label;
const statusTone = (status: CustomerStatus) => ({ active: "ok", prospect: "info", paused: "neutral" } as const)[status];
const industryLabel = (industry: Industry) => industries.find((item) => item.value === industry)!.label;
const columns: DataColumn[] = [
  { key: "company", title: "客户名称", minWidth: 240, sortable: true },
  { key: "contact", title: "联系人", width: 150 },
  { key: "industry", title: "行业", width: 116 },
  { key: "city", title: "城市", width: 80 },
  { key: "status", title: "合作状态", width: 116 },
  { key: "owner", title: "负责人", width: 90 },
  { key: "updated", title: "最近更新", width: 132, sortable: true },
];
const route = useRoute();
const router = useRouter();
const toast = useToast();
const pageSizes = [10, 15, 25];
interface Filters { search: string; status: string; page: number; pageSize: number; sort: SortState | null }
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
    status: statuses.some((item) => item.value === queryText("status")) ? queryText("status") : "",
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    pageSize: pageSizes.includes(rawSize) ? rawSize : 15,
    sort: rawSort === "none" ? null : {
      key: rawSort === "company" ? "company" : "updated", dir: rawDirection === "asc" ? "asc" : "desc",
    },
  };
});
/** 仅更新本例的地址参数，其他开发工具参数继续保留。 */
function setFilters(patch: Partial<Filters>) {
  const value = { ...filters.value, ...patch };
  const query = { ...route.query };
  for (const key of ["search", "status", "page", "size", "sort", "direction"]) delete query[`customer_${key}`];
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
const search = computed({ get: () => filters.value.search, set: (value: string) => { void setFilters({ search: value, page: 1 }); } });
const status = computed({ get: () => filters.value.status, set: (value: string) => { void setFilters({ status: value, page: 1 }); } });
const pageSize = computed({ get: () => filters.value.pageSize, set: (value: number) => { void setFilters({ pageSize: value, page: 1 }); } });
const sort = computed({ get: () => filters.value.sort, set: (value: SortState | null) => { void setFilters({ sort: value, page: 1 }); } });
const filtered = computed(() => {
  const needle = search.value.trim().toLocaleLowerCase("zh-CN");
  return customers.value.filter((customer) => (!status.value || customer.status === status.value)
    && (!needle || [customer.company, customer.contact, customer.phone].some((value) => value.toLocaleLowerCase("zh-CN").includes(needle))));
});
const sorted = computed(() => {
  if (!sort.value) return filtered.value;
  const { key, dir } = sort.value;
  return [...filtered.value].sort((a, b) => a[key as "company" | "updated"].localeCompare(b[key as "company" | "updated"], "zh-CN") * (dir === "asc" ? 1 : -1));
});
const page = computed({
  get: () => Math.min(filters.value.page, Math.max(1, Math.ceil(filtered.value.length / pageSize.value))),
  set: (value: number) => { void setFilters({ page: value }); },
});
const rows = computed(() => sorted.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
function resetFilters() { void setFilters({ search: "", status: "", page: 1 }); }

const createOpen = ref(false);
const discardOpen = ref(false);
const submitted = ref(false);
const newForm = ref<HTMLFormElement>();
const blankDraft = () => ({ company: "", contact: "", phone: "", industry: "technology", city: "" });
const draft = reactive(blankDraft());
const dirty = computed(() => Object.entries(blankDraft()).some(([key, value]) => draft[key as keyof typeof draft] !== value));
useUnsaved(dirty, "客户信息尚未添加。确认离开吗？");
const errors = computed(() => ({
  company: draft.company.trim().length < 2 || draft.company.trim().length > 80 ? "请输入 2–80 个字的客户名称" : "",
  contact: draft.contact.trim().length < 2 || draft.contact.trim().length > 30 ? "请输入 2–30 个字的联系人姓名" : "",
  phone: /^1[3-9]\d{9}$/.test(draft.phone.trim()) ? "" : "请输入 11 位中国大陆手机号",
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
/** 本地校验通过后添加真实内存记录；不模拟后台保存，也不发送通知。 */
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
    id: `KH-${1001 + customers.value.length}`, company: draft.company.trim(),
    contact: draft.contact.trim(), phone: draft.phone.trim(),
    industry: draft.industry as Industry, city: draft.city.trim() || "未填写", status: "prospect",
    owner: "林晓", created: today, updated: today,
  };
  customers.value.unshift(customer);
  createOpen.value = false;
  Object.assign(draft, blankDraft());
  await setFilters({ search: "", status: "", page: 1, sort: { key: "updated", dir: "desc" } });
  toast.success(`已添加 ${customer.company}，仅本次演示保留`);
}
const detailOpen = ref(false);
const inspected = ref<Customer>();
function inspect(customer: Customer) { inspected.value = customer; detailOpen.value = true; }
const details = computed(() => inspected.value ? [
  { label: "客户编号", value: inspected.value.id },
  { label: "联系人", value: inspected.value.contact },
  { label: "联系电话", value: inspected.value.phone },
  { label: "所属行业", value: industryLabel(inspected.value.industry) },
  { label: "所在城市", value: inspected.value.city },
  { label: "负责人", value: inspected.value.owner },
  { label: "创建日期", value: inspected.value.created },
  { label: "最近更新", value: inspected.value.updated },
] : []);
</script>

<template>
  <PageFrame title="客户管理" workspace>
    <template #actions><UiButton variant="primary" icon="plus" @click="startCreate">新建客户</UiButton></template>
    <template #status><StatusLine :items="[{ text: '本地演示 · 刷新后还原' }, { text: `共 ${customers.length} 位客户` }]" /></template>
    <DataTable fill flat server-sort v-model:sort="sort" v-model:page="page" v-model:page-size="pageSize"
      :columns="columns" :rows="rows" row-key="id" :total="filtered.length" :sizes="pageSizes" :scroll-key="route.fullPath">
      <template #search>
        <Row>
          <FilterItem size="lg"><UiSearchInput v-model="search" placeholder="搜索客户、联系人或手机号" aria-label="搜索客户、联系人或手机号" /></FilterItem>
          <FilterItem size="sm"><UiSelect v-model="status" :options="statuses" aria-label="合作状态" /></FilterItem>
          <UiButton v-if="search || status" variant="ghost" size="sm" @click="resetFilters">清除筛选</UiButton>
        </Row>
      </template>
      <template #cell-company="{ row }"><UiButton variant="text" :aria-label="`查看${row.company}`" @click="inspect(row)">{{ row.company }}</UiButton></template>
      <template #cell-contact="{ row }"><CellText :title="row.contact">{{ row.phone }}</CellText></template>
      <template #cell-industry="{ row }">{{ industryLabel(row.industry) }}</template>
      <template #cell-status="{ row }"><UiTag :tone="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</UiTag></template>
      <template #empty><UiEmpty title="没有符合条件的客户" hint="换个关键词，或清除筛选重新查找。"><UiButton @click="resetFilters">清除筛选</UiButton></UiEmpty></template>
    </DataTable>
  </PageFrame>

  <UiDialog :open="createOpen" @update:open="requestCreateOpen" title="新建客户" description="记录仅在本次演示中保留，刷新后还原。">
    <form id="customer-create-form" ref="newForm" aria-label="新建客户" novalidate @submit.prevent="createCustomer">
      <Stack>
        <Field label="客户名称" required :error="submitted ? errors.company : undefined"><UiInput v-model="draft.company" placeholder="如：云杉数字科技" autocomplete="organization" maxlength="80" /></Field>
        <Field label="联系人" required :error="submitted ? errors.contact : undefined"><UiInput v-model="draft.contact" placeholder="联系人姓名" autocomplete="name" maxlength="30" /></Field>
        <Field label="手机号" required :error="submitted ? errors.phone : undefined"><UiInput v-model="draft.phone" placeholder="11 位中国大陆手机号" inputmode="tel" autocomplete="tel" maxlength="11" /></Field>
        <Field label="所属行业"><UiSelect v-model="draft.industry" :options="industries" /></Field>
        <Field label="所在城市" :error="submitted ? errors.city : undefined"><UiInput v-model="draft.city" placeholder="选填" autocomplete="address-level2" maxlength="20" /></Field>
      </Stack>
    </form>
    <template #footer>
      <UiButton variant="ghost" @click="requestCreateOpen(false)">取消</UiButton>
      <UiButton variant="primary" type="submit" form="customer-create-form">添加客户</UiButton>
    </template>
  </UiDialog>
  <UiDialog v-model:open="discardOpen" title="放弃未添加的客户？" description="已填写的内容会被清除。">
    <template #footer><UiButton @click="discardOpen = false">继续填写</UiButton><UiButton variant="danger" @click="discardDraft">放弃填写</UiButton></template>
  </UiDialog>
  <UiDrawer v-model:open="detailOpen" :title="inspected?.company ?? '客户详情'">
    <Stack v-if="inspected" gap="lg">
      <Row><UiTag :tone="statusTone(inspected.status)" dot>{{ statusLabel(inspected.status) }}</UiTag><UiTag tone="neutral">{{ industryLabel(inspected.industry) }}</UiTag></Row>
      <DescriptionList :items="details" />
      <UiAccordion :items="[{ value: 'history', title: '资料记录' }]"><template #item-history>
        <Timeline :items="inspected.created === inspected.updated
          ? [{ title: `创建客户资料 · ${inspected.owner}`, time: inspected.created }]
          : [{ title: `更新客户资料 · ${inspected.owner}`, time: inspected.updated }, { title: '创建客户资料', time: inspected.created }]" />
      </template></UiAccordion>
    </Stack>
    <template #footer><UiButton @click="detailOpen = false">关闭详情</UiButton></template>
  </UiDrawer>
</template>
