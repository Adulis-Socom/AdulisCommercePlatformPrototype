// COMP-002 (FR-007 Team): the Seller team in the Companion from the imported teams, members, role grants, tasks and team messages; "act as" a member changes
// what the Companion allows; task updates and team messages follow the documented permission rules; administration stays in the Seller Console.
// REAL app, marketplace dataset (tests/suites.json marks it), 390x844 (the phone) and 1440x900 (the phone frame). Expected values come from the generated dataset.
import { suite } from './harness.mjs'
import { comp, ops, cat, SESSION_KEY, cap } from './comp-helpers.mjs'

const members = id => ops.team_members.filter(m => m.seller_id === id)
const byRole = (seller, role) => members(seller).find(m => m.relationship_type === 'TEAM' && m.membership_status === 'ACTIVE' && m.roles.length === 1 && m.roles[0] === role)
const grants = role => new Set(ops.role_grants.filter(g => g.role_code === role).map(g => g.permission_code))
const first = name => name.split(' ')[0]
const noVariants = id => cat.products.find(p => p.seller_id === id && p.publication === 'PUBLISHED' && p.stock > 4 && !cat.variants.some(v => v.product_id === p.product_id))
const S01 = 'DS-01'

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  await suite('comp002', viewport, async (page, t) => {
    const c = comp(page, t, viewport)
    const phone = viewport.width <= 640
    const body = () => c.text()
    const expectNotPermitted = async (label, code, permission) => {
      const loc = page.locator(`[data-not-permitted="${code}"]`).first()
      const text = await loc.innerText().catch(() => '')
      t.ck(label, (await loc.count()) === 1 && (!permission || text.includes(permission)) && /Not permitted/.test(text), text.slice(0, 200))
    }

    // ---- 1. Teams: full, partial (multi-role, invited), revoked, owner-only, suspended, draft ----
    await c.open(S01, 'Team')
    const team1 = ops.teams.find(x => x.seller_id === S01)
    t.ck('DS-01 is a Full team and says so', (await page.locator('[data-team-config]').getAttribute('data-team-config')) === 'FULL_ROLE_COVERAGE' && /Full team/.test(await body()))
    t.eq('DS-01 lists all 7 members', await page.locator('[data-member]').count(), members(S01).length)
    t.ck('DS-01: statuses are as the dataset has them (1 owner, 5 active, 1 invited)', await page.locator('[data-member-status="OWNER_RELATIONSHIP"]').count() === 1 && await page.locator('[data-member-status="ACTIVE"]').count() === 5 && await page.locator('[data-member-status="INVITED"]').count() === 1)
    const owner = members(S01).find(m => m.relationship_type === 'OWNERSHIP')
    t.ck('the Owner is shown as derived from ownership, never as an assignable role', /Owner · from Seller ownership/.test(await page.locator(`[data-member="${owner.member_id}"]`).innerText()))
    t.ck('the summary counts who can act and the open tasks', /6 of 7 members can act/.test(await page.locator('[data-team-summary]').innerText()) && /4 open tasks/.test(await page.locator('[data-team-summary]').innerText()))
    t.ck('Team is read-only here: a clear "Manage in Seller Console" pointer, no invite or role-edit controls', await page.locator('[data-manage-in-console]').count() === 1 && /Inviting, role changes and removal are managed in the Seller Console/.test(await body()) && await page.getByRole('button', { name: /^(Invite|Edit roles|Remove)/ }).count() === 0)
    await c.overflow('Team (full team)')

    for (const [seller, config, label] of [['DS-03', 'PARTIAL_ROLE_COVERAGE', 'Partial team'], ['DS-10', 'PARTIAL_ROLE_COVERAGE', 'Partial team'], ['DS-07', 'OWNER_ONLY', 'Owner only'], ['DS-23', 'PARTIAL_ROLE_COVERAGE', 'Partial team'], ['DS-11', 'OWNER_ONLY', 'Owner only']]) {
      await c.open(seller, 'Team')
      const ms = members(seller)
      t.ck(`${seller}: ${label}, ${ms.length} member${ms.length === 1 ? '' : 's'}`, (await page.locator('[data-team-config]').getAttribute('data-team-config')) === config && (await page.locator('[data-member]').count()) === ms.length && (await page.locator('[data-team-config]').innerText()) === label)
      for (const st of ['INVITED', 'REVOKED', 'SUSPENDED']) t.eq(`${seller}: ${st.toLowerCase()} memberships shown`, await page.locator(`[data-member-status="${st}"]`).count(), ms.filter(m => m.membership_status === st).length)
      if (ms.length === 1) t.ck(`${seller}: owner-only business says so`, /Only the Owner is on this team so far/.test(await body()))
    }
    await c.open('DS-03', 'Team')
    const multi = members('DS-03').find(m => m.roles.length > 1)
    t.ck('DS-03: a member with two roles shows both', /Inventory/.test(await page.locator(`[data-member="${multi.member_id}"]`).innerText()) && /Sales Support/.test(await page.locator(`[data-member="${multi.member_id}"]`).innerText()))

    // ---- 2. Member detail ----
    await c.open(S01, 'Team')
    const admin = byRole(S01, 'ADMIN')
    await c.click(page.locator(`[data-member="${admin.member_id}"]`))
    let detail = await page.locator(`[data-member-detail="${admin.member_id}"]`).innerText()
    t.ck('member detail: name, username, role, joined date, status', detail.includes(admin.display_name) && detail.includes(admin.username) && /Admin/.test(detail) && /21 Nov 2026/.test(detail) && /Active/.test(detail), detail.slice(0, 300))
    t.ck('the permissions summary counts the role grants (ADMIN)', new RegExp(`${grants('ADMIN').size} permissions from the role grants of Admin`).test(detail), detail.slice(0, 500))
    t.ck('assigned tasks are listed on the member', await page.locator(`[data-member-detail] [data-task="${admin.member_id}-TASK1"]`).count() === 1)
    await page.getByRole('button', { name: 'Back to Team' }).click(); await t.settle(300)
    const invited = members(S01).find(m => m.membership_status === 'INVITED')
    await c.click(page.locator(`[data-member="${invited.member_id}"]`))
    t.ck('an invited member: "no access" and the permissions the role WOULD grant', await page.locator('[data-no-access]').count() === 1 && /Invited: no access/.test(await page.locator('[data-no-access]').innerText()))
    await c.overflow('Member detail')
    await page.getByRole('button', { name: 'Back to Team' }).click(); await t.settle(300)
    await c.open('DS-03', 'Team')
    await c.click(page.locator(`[data-member="${multi.member_id}"]`))
    const union = new Set([...grants('INVENTORY'), ...grants('SALES_SUPPORT')]).size
    t.ck('a member with several roles has the union of their grants', new RegExp(`${union} permissions from the role grants of Inventory \\+ Sales Support`).test(await page.locator('[data-permission-count]').innerText()))

    // ---- 3. Act as: the Companion follows the member's permissions ----
    await c.open(S01, 'Team')
    const analyst = byRole(S01, 'ANALYST'), support = byRole(S01, 'SALES_SUPPORT'), inventory = byRole(S01, 'INVENTORY'), campaign = byRole(S01, 'CAMPAIGN_MANAGER')
    t.ck('the Companion acts as the Owner by default', (await page.locator('[data-acting-as]').getAttribute('data-acting-as')) === owner.member_id)
    // Analyst
    await c.actAs(analyst.member_id)
    t.ck('acting as the Analyst is shown and stored for this Seller', (await page.locator('[data-acting-as]').getAttribute('data-acting-as')) === analyst.member_id && (await c.store(SESSION_KEY)).acting[S01] === analyst.member_id)
    await expectNotPermitted('Analyst: the team member directory is not permitted (seller.team:read)', 'role', 'seller.team:read')
    await c.tab('Catalogue'); await expectNotPermitted('Analyst: Catalogue is not permitted for the role, naming seller.products:read', 'role', 'seller.products:read')
    await c.tab('Inbox'); await expectNotPermitted('Analyst: Inbox is not permitted, naming seller.inbox:read', 'role', 'seller.inbox:read')
    t.ck('the refusal says "Not permitted for your role"', /Not permitted for your role/.test(await body()))
    // Sales Support
    await c.actAs(support.member_id)
    await c.tab('Catalogue'); await expectNotPermitted('Sales Support: no Catalogue access (seller.products:read)', 'role', 'seller.products:read')
    await c.tab('Inbox')
    t.ck('Sales Support: the Inbox is available', await page.locator('[data-not-permitted]').count() === 0 && (await page.locator('main.app-main button', { hasText: /Maya|Hana/ }).count()) >= 1, (await body()).slice(0, 200))
    await page.locator('main.app-main button', { hasText: /Maya|Hana/ }).first().click(); await t.settle(400)
    await page.getByRole('button', { name: 'Thank you', exact: true }).click()
    await page.getByRole('button', { name: 'Send', exact: true }).click(); await t.settle(400)
    t.ck('Sales Support can reply, and the reply is signed with their name', new RegExp(first(support.display_name)).test(await body()) && /Thank you for your message/.test(await body()) && await page.locator('[data-reply-refused]').count() === 0)
    await page.getByRole('button', { name: 'Back', exact: true }).click(); await t.settle(300)
    // Inventory
    await c.actAs(inventory.member_id)
    await c.tab('Inbox'); await expectNotPermitted('Inventory: no general Inbox access (seller.inbox:read)', 'role', 'seller.inbox:read')
    await c.tab('Catalogue')
    const prod = noVariants(S01)
    const stockOf = async () => Number((await page.locator('li', { hasText: prod.name }).first().locator('[aria-live="polite"]').innerText()).trim())
    const before = await stockOf()
    await page.getByRole('button', { name: `Increase ${prod.name} stock` }).click(); await t.settle(300)
    t.ck('Inventory can change stock', (await stockOf()) === before + 1 && await page.locator('[data-stock-refused]').count() === 0, { before, now: await stockOf() })
    // Campaign Manager
    await c.actAs(campaign.member_id)
    await c.tab('Catalogue')
    t.ck('Campaign Manager can see the Catalogue', await page.getByRole('button', { name: `Increase ${prod.name} stock` }).count() === 1)
    const cmBefore = await stockOf()
    await page.getByRole('button', { name: `Increase ${prod.name} stock` }).click(); await t.settle(300)
    t.ck('Campaign Manager cannot change stock: refused, naming seller.inventory:write, stock unchanged', (await stockOf()) === cmBefore && /seller\.inventory:write/.test(await page.locator('[data-stock-refused]').innerText()))
    // Invited member
    await c.actAs(invited.member_id)
    t.ck('an invited member cannot act: the Team tab says so', await page.locator('[data-not-permitted="membership"]').count() >= 1)
    await c.tab('Catalogue'); await expectNotPermitted('an invited member: Catalogue refused because the membership cannot act', 'membership')
    // Admin and Owner
    await c.actAs(admin.member_id)
    await c.tab('Catalogue')
    const adBefore = await stockOf()
    await page.getByRole('button', { name: `Increase ${prod.name} stock` }).click(); await t.settle(300)
    t.ck('an Admin can change stock', (await stockOf()) === adBefore + 1)
    await c.actAs(owner.member_id)

    // ---- 4. Tasks ----
    await c.open(S01, 'Team')
    await c.actAs(inventory.member_id)
    const myTask = ops.tasks.find(x => x.assignee_id === inventory.member_id)
    t.ck('"Tasks for <member>" lists the acting member\'s own tasks only', await page.locator(`[data-task="${myTask.task_id}"]`).count() >= 1 && /tasks for/i.test(await body()))
    await c.click(page.locator(`[data-task="${myTask.task_id}"]`))
    t.ck('task detail: status, priority, due, surface, the required permission and the "assignment grants nothing" note', await page.locator(`[data-task-detail="${myTask.task_id}"][data-task-status="${myTask.status}"]`).count() === 1 && new RegExp(myTask.required_permission).test(await body()) && /does not grant its permission/.test(await body()))
    await page.getByRole('button', { name: 'Start', exact: true }).click(); await t.settle(300)
    t.ck('the assignee starts it: OPEN -> In progress', await page.locator(`[data-task-detail][data-task-status="IN_PROGRESS"]`).count() === 1 && await page.locator('[data-task-updated]').count() === 1)
    await page.getByRole('button', { name: 'Mark done', exact: true }).click(); await t.settle(300)
    t.ck('then done: In progress -> Done, and a finished task is final', await page.locator(`[data-task-detail][data-task-status="DONE"]`).count() === 1 && /A finished task is final/.test(await body()))
    t.ck('the status is stored in the session overlay, the dataset record is untouched', (await c.store(SESSION_KEY)).tasks[myTask.task_id] === 'DONE' && ops.tasks.find(x => x.task_id === myTask.task_id).status === 'OPEN')
    await page.getByRole('button', { name: 'Back to Team' }).click(); await t.settle(300)
    t.ck('the list shows the new status', (await page.locator(`[data-task="${myTask.task_id}"]`).first().getAttribute('data-task-status')) === 'DONE')
    // Refusals: the owner's task (store:read, COMPANION) is opened from Alerts so any member can reach it
    const ownerTask = `${owner.member_id}-TASK1`
    const ownerTaskRow = ops.tasks.find(x => x.task_id === ownerTask)
    await c.actAs(analyst.member_id)
    await c.tab('Alerts')
    await c.click(page.locator(`[data-alert="task:${ownerTask}"] button`).first())
    await page.getByRole('button', { name: 'Start', exact: true }).click(); await t.settle(300)
    t.ck(`the Analyst (assigned nothing, no ${ownerTaskRow.required_permission}) is refused: role, naming the permission, "assignment does not grant it"`, await page.locator('[data-task-refused] [data-not-permitted="role"]').count() === 1 && (await page.locator('[data-task-refused]').innerText()).includes(ownerTaskRow.required_permission) && /does not grant it/.test(await page.locator('[data-task-refused]').innerText()))
    t.ck('a refused update leaves the status as it was', (await page.locator('[data-task-detail]').getAttribute('data-task-status')) === 'OPEN' && !(await c.store(SESSION_KEY)).tasks[ownerTask])
    const peerRole = ['SALES_SUPPORT', 'INVENTORY', 'CAMPAIGN_MANAGER'].find(r => grants(r).has(ownerTaskRow.required_permission))
    if (peerRole) {
      await c.actAs(byRole(S01, peerRole).member_id)
      await c.tab('Alerts'); await c.click(page.locator(`[data-alert="task:${ownerTask}"] button`).first())
      await page.getByRole('button', { name: 'Start', exact: true }).click(); await t.settle(300)
      t.ck(`a ${cap(peerRole.replace('_', ' '))} who holds the permission but is not the assignee, an Admin or the Owner is refused (assignee rule)`, await page.locator('[data-task-refused] [data-not-permitted="assignee"]').count() === 1)
    } else t.ck('no peer role holds the Owner task permission (rule not exercised)', true)
    await c.actAs(owner.member_id)
    await c.tab('Alerts'); await c.click(page.locator(`[data-alert="task:${ownerTask}"] button`).first())
    await page.getByRole('button', { name: 'Start', exact: true }).click(); await t.settle(300)
    await page.getByRole('button', { name: 'Mark done', exact: true }).click(); await t.settle(300)
    await c.backToAlerts()
    t.ck('the Owner completes the task and its alert disappears', await c.alert(`task:${ownerTask}`).count() === 0)
    // The Console task is refused in the Companion; an Admin may update another member's task
    await c.tab('Team')
    const consoleTask = ops.tasks.find(x => x.seller_id === S01 && x.execution_surface === 'CONSOLE' && x.status !== 'DONE')
    await c.click(page.locator(`[data-task="${consoleTask.task_id}"]`))
    await page.getByRole('button', { name: /^(Start|Mark done)$/ }).first().click(); await t.settle(300)
    t.ck('a task completed in the Seller Console is refused in the Companion (surface)', await page.locator('[data-task-refused] [data-not-permitted="surface"]').count() === 1 && /Seller Console/.test(await page.locator('[data-task-refused]').innerText()))
    await page.getByRole('button', { name: 'Back to Team' }).click(); await t.settle(300)
    await c.actAs(admin.member_id)
    const invTask = ops.tasks.find(x => x.seller_id === S01 && x.assignee_id === inventory.member_id)
    const other = ops.tasks.find(x => x.seller_id === S01 && x.assignee_id !== admin.member_id && x.execution_surface === 'COMPANION' && x.status === 'OPEN' && x.task_id !== invTask.task_id && x.task_id !== ownerTask)
    if (other) {
      await c.click(page.locator(`[data-task="${other.task_id}"]`))
      await page.getByRole('button', { name: 'Start', exact: true }).click(); await t.settle(300)
      t.ck('an Admin who holds the permission may update another member\'s Companion task', await page.locator('[data-task-detail][data-task-status="IN_PROGRESS"]').count() === 1, other)
    }
    await c.overflow('Task detail')

    // ---- 5. The team thread ----
    await c.open(S01, 'Team')
    await c.actAs(owner.member_id)
    const msgs = ops.team_messages.filter(m => m.seller_id === S01)
    t.eq('the thread shows the dataset\'s team messages for DS-01', await page.locator('[data-team-message]').count(), msgs.length)
    t.ck('a task-linked message names its task', /Re: Review team coverage in Console/.test(await page.locator('[data-team-thread]').innerText()))
    await page.getByLabel('Message the team').fill('Stock count done for the dresses.')
    await page.getByRole('button', { name: 'Send', exact: true }).click(); await t.settle(300)
    t.ck('sending adds the message as the acting member (the Owner) with "Just now"', await page.locator('[data-team-message]').count() === msgs.length + 1 && /Just now/.test(await page.locator('[data-team-thread]').innerText()) && new RegExp(owner.display_name).test(await page.locator('[data-team-message]').last().innerText()))
    t.ck('the message is stored in the session for DS-01 only', (await c.store(SESSION_KEY)).messages[S01]?.length === 1 && !(await c.store(SESSION_KEY)).messages['DS-02'])
    await c.tab('Alerts'); await c.tab('Team')
    t.eq('the thread keeps it after a tab change', await page.locator('[data-team-message]').count(), msgs.length + 1)
    await c.actAs(invited.member_id)
    await page.getByLabel('Message the team').fill('Can I post?')
    await page.getByRole('button', { name: 'Send', exact: true }).click(); await t.settle(300)
    t.ck('an invited member cannot post (refused, membership)', await page.locator('[data-message-refused] [data-not-permitted="membership"]').count() === 1 && await page.locator('[data-team-message]').count() === msgs.length + 1)
    await c.open('DS-02', 'Team')
    t.eq('another Seller\'s thread is its own (DS-02)', await page.locator('[data-team-message]').count(), ops.team_messages.filter(m => m.seller_id === 'DS-02').length)
    await c.open('DS-23', 'Team')
    await page.getByLabel('Message the team').fill('Hello')
    await page.getByRole('button', { name: 'Send', exact: true }).click(); await t.settle(300)
    t.ck('DS-23 (Suspended Seller): the thread is read-only (lifecycle)', await page.locator('[data-message-refused] [data-not-permitted="lifecycle"]').count() === 1)

    // ---- 6. Seller Console consistency and the pointer ----
    await c.open('DS-03', 'Team')
    await c.click(page.getByRole('button', { name: 'Manage in Seller Console' }))
    const sidebar = await page.locator('.seller-console-sidebar').innerText()
    t.ck('"Manage in Seller Console" opens the Console on the SAME Seller (DS-03 Little Juniper)', /Little Juniper/.test(sidebar), sidebar.slice(0, 120))
    if (phone) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await t.settle(300); await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Settings/ }).first().click() } else await page.getByRole('button', { name: /^Settings/ }).first().click()
    await t.settle(500)
    if (phone) { await page.getByRole('navigation', { name: 'Settings sections' }).getByRole('button', { name: /^Team/ }).click(); await t.settle(400) }
    const consoleTeam = await page.locator('main.app-main').innerText()
    const ds03 = members('DS-03')
    t.ck('the Console Team page reads the same dataset: every DS-03 member by name', ds03.every(m => consoleTeam.includes(m.display_name)), consoleTeam.slice(0, 200))
    t.ck('the Console shows the invited member as Invited (not Active)', /Invited: has not joined yet/.test(consoleTeam) && await page.locator('article[aria-label="' + ds03.find(m => m.membership_status === 'INVITED').display_name + '"]').count() === 1)
    t.ck('the Console shows the multi-role member with both roles', /Inventory/.test(consoleTeam) && /Sales Support/.test(consoleTeam))
    await c.open('DS-10', 'Team')
    await c.click(page.getByRole('button', { name: 'Manage in Seller Console' }))
    if (phone) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await t.settle(300); await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Settings/ }).first().click() } else await page.getByRole('button', { name: /^Settings/ }).first().click()
    await t.settle(500)
    if (phone) { await page.getByRole('navigation', { name: 'Settings sections' }).getByRole('button', { name: /^Team/ }).click(); await t.settle(400) }
    t.ck('DS-10 in the Console: the revoked membership reads Revoked, with no reinstate button', /Revoked: the membership was revoked/.test(await page.locator('main.app-main').innerText()) && await page.getByRole('button', { name: /Reactivate|Undo removal/ }).count() === 0)
    await t.section('06 Mobile — Seller Companion'); await t.settle(400)
    t.ck('going back to the Companion keeps the Seller (DS-10 Nile Loom)', new RegExp(cat.sellers.find(s => s.seller_id === 'DS-10').name).test(await page.locator('main.app-main').innerText()))
  })
}
