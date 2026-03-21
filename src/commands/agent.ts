import { input, select, confirm } from '@inquirer/prompts'
import { homedir } from 'os'
import path from 'path'
import chalk from 'chalk'
import { log } from '../utils/logger.js'
import { maskSecret } from '../utils/mask.js'
import { createFsConfigRepo, createFsManagerConfigRepo } from '../adapters/fs-config-repo.js'
import { createFsAdapter } from '../adapters/fs-adapter.js'
import { createAgentService } from '../core/agent-service.js'
import { DEFAULT_MODELS } from '../core/configgen.js'
import type { AgentAddParams, AgentInfo } from '../types.js'

type AgentSvc = ReturnType<typeof createAgentService>

export async function agentCommand() {
  const home = homedir()
  const configPath = path.join(home, '.openclaw', 'openclaw.json')
  const mgrConfigPath = path.join(home, '.config', 'openclaw-manager', 'config.json')

  const configRepo = createFsConfigRepo(configPath)
  const mgrConfigRepo = createFsManagerConfigRepo(mgrConfigPath)
  const fsPort = createFsAdapter()

  // Pre-checks
  if (!(await mgrConfigRepo.exists())) {
    log.error('请先运行 install 命令')
    process.exit(1)
  }
  if (!(await configRepo.exists())) {
    log.error('请先运行 install 命令')
    process.exit(1)
  }

  const svc = createAgentService(configRepo, mgrConfigRepo, fsPort)

  // Main loop
  while (true) {
    // Display agent table
    const agents = await svc.listAgents()
    console.clear()
    console.log()
    if (agents.length === 0) {
      log.info('暂无 Agent')
    } else {
      printAgentTable(agents)
    }
    console.log()

    // Menu
    const action = await select({
      message: '操作',
      choices: [
        { name: '添加 Agent', value: 'add' },
        { name: '删除 Agent', value: 'delete' },
        { name: '编辑 Agent', value: 'edit' },
        { name: '退出', value: 'exit' },
      ],
    })

    if (action === 'exit') break
    if (action === 'add') await handleAdd(svc)
    if (action === 'delete') await handleDelete(svc, agents)
    if (action === 'edit') await handleEdit(svc, agents)
  }
}

function printAgentTable(agents: AgentInfo[]) {
  const header = `${'ID'.padEnd(16)} ${'Name'.padEnd(16)} ${'Channel'.padEnd(10)} Model`
  console.log(chalk.bold(header))
  console.log('-'.repeat(60))
  for (const a of agents) {
    console.log(`${a.id.padEnd(16)} ${a.name.padEnd(16)} ${a.channel.padEnd(10)} ${a.model}`)
  }
}

async function handleAdd(svc: AgentSvc) {
  let params: AgentAddParams = {
    id: '', name: '', apiKey: '', modelId: 'claude-opus-4-5',
    feishuAppId: '', feishuAppSecret: '',
  }

  params = await collectAgentFields(svc, params)

  // Confirmation loop
  while (true) {
    printSummary('新增 Agent', params)
    const action = await select({
      message: '操作',
      choices: [
        { name: '确认提交', value: 'confirm' },
        { name: '修改某个字段', value: 'edit' },
        { name: '取消', value: 'cancel' },
      ],
    })

    if (action === 'cancel') return
    if (action === 'confirm') break
    if (action === 'edit') {
      const field = await select({
        message: '选择要修改的字段',
        choices: [
          { name: 'Agent ID', value: 'id' },
          { name: '显示名称', value: 'name' },
          { name: 'Nebula API Key', value: 'apiKey' },
          { name: '模型', value: 'modelId' },
          { name: '飞书 App ID', value: 'feishuAppId' },
          { name: '飞书 App Secret', value: 'feishuAppSecret' },
        ],
      })
      params = await collectSingleField(svc, params, field)
    }
  }

  try {
    await svc.addAgent(params)
    log.success(`Agent "${params.name}" (${params.id}) 添加成功`)
  } catch (error: any) {
    log.error(`添加失败: ${error.message}`)
  }
}

async function collectAgentFields(svc: AgentSvc, initial: AgentAddParams): Promise<AgentAddParams> {
  const params = { ...initial }

  params.id = await input({
    message: 'Agent ID:',
    default: params.id || undefined,
    validate: async (value) => {
      if (!value.trim()) return 'Agent ID 不能为空'
      if (await svc.isAgentIdDuplicate(value.trim())) {
        return `Agent ID "${value}" 已存在，请输入其他 ID`
      }
      return true
    },
  })

  params.name = await input({
    message: '显示名称:',
    default: params.name || undefined,
    validate: (value) => value.trim() ? true : '显示名称不能为空',
  })

  params.apiKey = await input({
    message: 'Nebula API Key:',
    validate: (value) => value.trim() ? true : 'API Key 不能为空',
    transformer: (value, { isFinal }) => isFinal ? maskSecret(value, 6, 6) : value,
  })
  if (await svc.isApiKeyDuplicate(params.apiKey)) {
    log.warn('该 API Key 已被其他 Agent 使用')
  }

  params.modelId = await select({
    message: '模型:',
    choices: DEFAULT_MODELS.map(m => ({ name: m.name, value: m.id as string })),
    default: params.modelId,
  })

  params.feishuAppId = await input({
    message: '飞书 App ID:',
    default: params.feishuAppId || undefined,
    validate: (value) => value.trim() ? true : 'App ID 不能为空',
  })
  if (await svc.isFeishuAppIdDuplicate(params.feishuAppId)) {
    log.warn('该飞书 App ID 已被其他 Agent 使用')
  }

  params.feishuAppSecret = await input({
    message: '飞书 App Secret:',
    validate: (value) => value.trim() ? true : 'App Secret 不能为空',
    transformer: (value, { isFinal }) => isFinal ? maskSecret(value, 6, 6) : value,
  })

  return params
}

async function collectSingleField(svc: AgentSvc, params: AgentAddParams, field: string): Promise<AgentAddParams> {
  const updated = { ...params }

  switch (field) {
    case 'id':
      updated.id = await input({
        message: 'Agent ID:',
        default: params.id,
        validate: async (value) => {
          if (!value.trim()) return 'Agent ID 不能为空'
          if (value !== params.id && await svc.isAgentIdDuplicate(value.trim())) {
            return `Agent ID "${value}" 已存在`
          }
          return true
        },
      })
      break
    case 'name':
      updated.name = await input({ message: '显示名称:', default: params.name })
      break
    case 'apiKey':
      updated.apiKey = await input({
        message: 'Nebula API Key:',
        transformer: (value, { isFinal }) => isFinal ? maskSecret(value, 6, 6) : value,
      })
      if (await svc.isApiKeyDuplicate(updated.apiKey)) log.warn('该 API Key 已被其他 Agent 使用')
      break
    case 'modelId':
      updated.modelId = await select({
        message: '模型:',
        choices: DEFAULT_MODELS.map(m => ({ name: m.name, value: m.id as string })),
        default: params.modelId,
      })
      break
    case 'feishuAppId':
      updated.feishuAppId = await input({ message: '飞书 App ID:', default: params.feishuAppId })
      if (await svc.isFeishuAppIdDuplicate(updated.feishuAppId)) log.warn('该飞书 App ID 已被其他 Agent 使用')
      break
    case 'feishuAppSecret':
      updated.feishuAppSecret = await input({
        message: '飞书 App Secret:',
        transformer: (value, { isFinal }) => isFinal ? maskSecret(value, 6, 6) : value,
      })
      break
  }

  return updated
}

function printSummary(title: string, params: AgentAddParams) {
  const modelName = DEFAULT_MODELS.find(m => m.id === params.modelId)?.name ?? params.modelId
  console.log()
  console.log(chalk.bold(`┌ ${title}`))
  console.log('│')
  console.log(`│  Agent ID:         ${params.id}`)
  console.log(`│  显示名称:         ${params.name}`)
  console.log(`│  Nebula API Key:   ${maskSecret(params.apiKey, 6, 6)}`)
  console.log(`│  模型:             ${modelName}`)
  console.log(`│  飞书 App ID:      ${params.feishuAppId}`)
  console.log(`│  飞书 App Secret:  ${maskSecret(params.feishuAppSecret, 6, 6)}`)
  console.log('│')
  console.log(chalk.bold('└'))
  console.log()
}

async function handleDelete(svc: AgentSvc, agents: AgentInfo[]) {
  if (agents.length === 0) {
    log.info('暂无 Agent 可删除')
    return
  }

  const agentId = await select({
    message: '选择要删除的 Agent',
    choices: agents.map(a => ({ name: `${a.name} (${a.id})`, value: a.id })),
  })

  const agent = agents.find(a => a.id === agentId)!
  const confirmed = await confirm({
    message: `确认删除 Agent "${agent.name}" (${agentId})？`,
    default: false,
  })

  if (!confirmed) return

  try {
    await svc.removeAgent(agentId)
    log.success(`Agent "${agent.name}" (${agentId}) 已删除`)
  } catch (error: any) {
    log.error(`删除失败: ${error.message}`)
  }
}

async function handleEdit(svc: AgentSvc, agents: AgentInfo[]) {
  if (agents.length === 0) {
    log.info('暂无 Agent 可编辑')
    return
  }

  const agentId = await select({
    message: '选择要编辑的 Agent',
    choices: agents.map(a => ({ name: `${a.name} (${a.id})`, value: a.id })),
  })

  const field = await select({
    message: '选择要修改的字段',
    choices: [
      { name: 'API Key', value: 'apiKey' },
      { name: '模型', value: 'modelId' },
      { name: '飞书 App ID', value: 'feishuAppId' },
      { name: '飞书 App Secret', value: 'feishuAppSecret' },
    ],
  })

  const fieldLabels: Record<string, string> = {
    apiKey: 'Nebula API Key',
    modelId: '模型',
    feishuAppId: '飞书 App ID',
    feishuAppSecret: '飞书 App Secret',
  }

  let newValue: string
  switch (field) {
    case 'apiKey':
      newValue = await input({
        message: '新的 Nebula API Key:',
        transformer: (value, { isFinal }) => isFinal ? maskSecret(value, 6, 6) : value,
      })
      if (await svc.isApiKeyDuplicate(newValue)) log.warn('该 API Key 已被其他 Agent 使用')
      break
    case 'modelId':
      newValue = await select({
        message: '新的模型:',
        choices: DEFAULT_MODELS.map(m => ({ name: m.name, value: m.id as string })),
      })
      break
    case 'feishuAppId':
      newValue = await input({ message: '新的飞书 App ID:' })
      if (await svc.isFeishuAppIdDuplicate(newValue)) log.warn('该飞书 App ID 已被其他 Agent 使用')
      break
    case 'feishuAppSecret':
      newValue = await input({
        message: '新的飞书 App Secret:',
        transformer: (value, { isFinal }) => isFinal ? maskSecret(value, 6, 6) : value,
      })
      break
    default:
      return
  }

  // Show edit summary
  const agent = agents.find(a => a.id === agentId)!
  const displayValue = (field === 'apiKey' || field === 'feishuAppSecret')
    ? maskSecret(newValue, 6, 6)
    : (field === 'modelId' ? (DEFAULT_MODELS.find(m => m.id === newValue)?.name ?? newValue) : newValue)

  console.log()
  console.log(chalk.bold(`┌ 编辑 Agent: ${agent.name} (${agentId})`))
  console.log('│')
  console.log(`│  ${fieldLabels[field]}:  ${displayValue}`)
  console.log('│')
  console.log(chalk.bold('└'))
  console.log()

  const confirmed = await confirm({
    message: '确认保存修改？',
    default: true,
  })

  if (!confirmed) return

  try {
    await svc.editAgent(agentId, { [field]: newValue })
    log.success('修改已保存')
  } catch (error: any) {
    log.error(`修改失败: ${error.message}`)
  }
}
