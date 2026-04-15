import api from '@/lib/api'

export const unwrap = (response) => response?.data?.data ?? response?.data

export const request = async (config) => unwrap(await api(config))
