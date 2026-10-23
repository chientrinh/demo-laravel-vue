import userRepository from '../../data/repositories/user.repository'
import type {
  PaginatedUsers,
  User,
  UserFilters,
  UserInput,
  UserOption,
} from '../../domain/types'

const userService = {
  list(): Promise<UserOption[]> {
    return userRepository.listOptions()
  },
  listPaginated(filters: UserFilters): Promise<PaginatedUsers> {
    return userRepository.list(filters)
  },
  get(id: string): Promise<User> {
    return userRepository.get(id)
  },
  create(input: UserInput): Promise<User> {
    return userRepository.create(input)
  },
  update(id: string, input: UserInput): Promise<User> {
    return userRepository.update(id, input)
  },
  remove(id: string): Promise<void> {
    return userRepository.remove(id)
  },
}

export default userService
