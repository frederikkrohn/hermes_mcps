import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { WAHAClient } from '../client.js';
import { ChatInfo } from '../types.js';
import { defineTool } from '../utils/define-tool.js';
import { listResponse, projectChat } from '../utils/format.js';
import { visibleIdMap } from '../utils/lid.js';
import { sessionParam } from '../utils/session.js';

interface WhatsAppList {
  id: string;
  name: string;
  chatCount?: number;
}

function projectList(list: WhatsAppList): Record<string, unknown> {
  return {
    id: list.id,
    name: list.name,
    chatCount: list.chatCount,
  };
}

export function registerListTools(server: McpServer, client: WAHAClient): void {
  defineTool(server, {
    name: 'waha_list_lists',
    description: 'List Personal WhatsApp Lists. These are distinct from Business Labels.',
    schema: { session: sessionParam() },
    annotations: { readOnlyHint: true },
    handler: async ({ session }) => {
      const lists = await client.get<WhatsAppList[]>(`/api/${encodeURIComponent(session)}/lists`);
      return listResponse(lists, { map: projectList, label: 'lists' });
    },
  });

  defineTool(server, {
    name: 'waha_create_list',
    description: 'Create a Personal WhatsApp List, optionally with its initial chat members.',
    schema: {
      name: z.string().describe('List name'),
      chatIds: z.array(z.string()).optional().describe('Optional initial chat IDs'),
      session: sessionParam(),
    },
    handler: async ({ name, chatIds, session }) => {
      const list = await client.post<WhatsAppList>(`/api/${encodeURIComponent(session)}/lists`, { name, chatIds });
      return `Created list. id=${list.id} name=${list.name}`;
    },
  });

  defineTool(server, {
    name: 'waha_rename_list',
    description: 'Rename a Personal WhatsApp List.',
    schema: { listId: z.string().describe('List ID'), name: z.string().describe('New name'), session: sessionParam() },
    annotations: { idempotentHint: true },
    handler: async ({ listId, name, session }) => {
      await client.patch(`/api/${encodeURIComponent(session)}/lists/${encodeURIComponent(listId)}`, { name });
      return `Renamed list ${listId}.`;
    },
  });

  defineTool(server, {
    name: 'waha_delete_list',
    description: 'Permanently delete a Personal WhatsApp List. Chats themselves are not deleted.',
    schema: { listId: z.string().describe('List ID'), session: sessionParam() },
    annotations: { destructiveHint: true, idempotentHint: true },
    handler: async ({ listId, session }) => {
      await client.delete(`/api/${encodeURIComponent(session)}/lists/${encodeURIComponent(listId)}`);
      return `Deleted list ${listId}.`;
    },
  });

  defineTool(server, {
    name: 'waha_get_list_chats',
    description: 'List chats belonging to a Personal WhatsApp List.',
    schema: { listId: z.string().describe('List ID'), session: sessionParam() },
    annotations: { readOnlyHint: true },
    handler: async ({ listId, session }) => {
      const chats = await client.get<ChatInfo[]>(`/api/${encodeURIComponent(session)}/lists/${encodeURIComponent(listId)}/chats`);
      const visibleId = await visibleIdMap(client, session, chats.map((chat) => chat.id));
      return listResponse(chats, { map: (chat) => projectChat(chat, visibleId), label: 'chats' });
    },
  });

  defineTool(server, {
    name: 'waha_add_chats_to_list',
    description: 'Add chats to a Personal WhatsApp List.',
    schema: { listId: z.string().describe('List ID'), chatIds: z.array(z.string()).min(1).describe('Chat IDs to add'), session: sessionParam() },
    annotations: { idempotentHint: true },
    handler: async ({ listId, chatIds, session }) => {
      await client.post(`/api/${encodeURIComponent(session)}/lists/${encodeURIComponent(listId)}/chats`, { chatIds });
      return `Added ${chatIds.length} chat(s) to list ${listId}.`;
    },
  });

  defineTool(server, {
    name: 'waha_remove_chats_from_list',
    description: 'Remove chats from a Personal WhatsApp List without deleting the chats.',
    schema: { listId: z.string().describe('List ID'), chatIds: z.array(z.string()).min(1).describe('Chat IDs to remove'), session: sessionParam() },
    annotations: { idempotentHint: true },
    handler: async ({ listId, chatIds, session }) => {
      await client.delete(`/api/${encodeURIComponent(session)}/lists/${encodeURIComponent(listId)}/chats`, { chatIds });
      return `Removed ${chatIds.length} chat(s) from list ${listId}.`;
    },
  });
}
