import { IUsersRepository } from "@/domain/auth/application/repositories/IUsersRepository";
import { UserAlreadyActiveError } from "./errors/userAlreadyActive";
import { User } from "../../enterprise/entities/user";
import { UserNotFoundError } from "./errors/userNotFound";
import {
  Either,
  right,
  left,
} from "@/domain/core/utils/functionalErrorHandling/either";
import { IUserTokensRepository } from "../repositories/IUserTokensRepository";
import { ConfirmBodySchema } from "../../authSettings";
import { DateProvider } from "@/services/dateProvider/dateProvider";
import { ResourceNotFoundError } from "@/domain/core/errors/resourceNotFoundError";
import { UserStatusNotAllowed } from "./errors/userStatusNotAllowed";

type ConfirmUserUseCaseResponse = Either<
  UserNotFoundError | UserAlreadyActiveError,
  {
    updatedUser: User;
  }
>;

export class ConfirmUserUseCase {
  constructor(
    private userTokensRepository: IUserTokensRepository,
    private usersRepository: IUsersRepository
  ) {}

  async execute(
    changePasswordData: ConfirmBodySchema
  ): Promise<ConfirmUserUseCaseResponse> {
    const token = await this.userTokensRepository.findById(
      changePasswordData.tokenId
    );

    const dateProvider = new DateProvider();

    if (
      !token ||
      dateProvider.compareIfBefore(
        token.expirationDateTime,
        new Date() || token.type == "account_confirmation"
      )
    ) {
      return left(new ResourceNotFoundError());
    }

    const user = await this.usersRepository.findById(changePasswordData.userId);

    if (!user) {
      return left(new UserNotFoundError(changePasswordData.userId));
    }

    if (user.status !== "registered") {
      return left(new UserStatusNotAllowed(changePasswordData.userId));
    }

    const updatedUser = await this.usersRepository.validateUser(
      user.id.toString()
    );

    return right({ updatedUser });
  }
}
