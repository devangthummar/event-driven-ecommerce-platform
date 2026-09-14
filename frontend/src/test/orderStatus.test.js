import { describe, test, expect } from 'vitest'
import {
  ORDER_PROGRESS_STEPS,
  availableTransitions,
  canTransition,
  isTerminalStatus,
  orderStatusMeta,
  progressIndex,
} from '../lib/orderStatus'

/* This file pins the UI to OrderServiceImpl.validateTransition: if a status is
   added or a transition changes on the server, this test should be the thing
   that fails first. */
describe('order status machine', () => {
  test('exposes exactly the five backend statuses', () => {
    expect(ORDER_PROGRESS_STEPS).toEqual(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'])
    expect(Object.keys(orderStatusMeta('PENDING'))).toContain('label')
    expect(orderStatusMeta('CANCELLED').label).toBe('Cancelled')
  })

  test('allows the transitions the server allows', () => {
    expect(canTransition('PENDING', 'PAID')).toBe(true)
    expect(canTransition('PENDING', 'CANCELLED')).toBe(true)
    expect(canTransition('PAID', 'SHIPPED')).toBe(true)
    expect(canTransition('SHIPPED', 'DELIVERED')).toBe(true)
  })

  test('rejects the transitions the server rejects', () => {
    expect(canTransition('PAID', 'PENDING')).toBe(false)
    expect(canTransition('PAID', 'CANCELLED')).toBe(false)
    expect(canTransition('SHIPPED', 'CANCELLED')).toBe(false)
    expect(canTransition('DELIVERED', 'SHIPPED')).toBe(false)
    expect(canTransition('CANCELLED', 'PAID')).toBe(false)
  })

  test('treats DELIVERED and CANCELLED as terminal', () => {
    expect(isTerminalStatus('PENDING')).toBe(false)
    expect(isTerminalStatus('PAID')).toBe(false)
    expect(isTerminalStatus('SHIPPED')).toBe(false)
    expect(isTerminalStatus('DELIVERED')).toBe(true)
    expect(isTerminalStatus('CANCELLED')).toBe(true)
    expect(availableTransitions('CANCELLED')).toEqual([])
    expect(availableTransitions('DELIVERED')).toEqual([])
  })

  test('maps a cancelled order off the happy path', () => {
    expect(progressIndex('CANCELLED')).toBe(-1)
    expect(progressIndex('PENDING')).toBe(0)
    expect(progressIndex('DELIVERED')).toBe(3)
  })
})
