import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { Transaction } from '../../domain/models/transaction/Transaction';
import { InputCreateTransactionDto } from '../input/dto/transaction/InputCreateTransactionDto';
import { TransactionServiceInputPort } from '../input/TransactionServiceInputPort';
import { TransactionPersistence } from '../output/TransactionPersistenceOutputPort';
import { UserPersistence } from '../output/UserPersistenceOutputPort';
import { WalletPersistence } from '../output/WalletPersistenceOutputPort';

export class TransactionService implements TransactionServiceInputPort {
  constructor(
    @Inject('TransactionPersistence')
    private readonly transactionRepository: TransactionPersistence,
    @Inject('WalletPersistence')
    private readonly walletRepository: WalletPersistence,
    @Inject('UserPersistence')
    private readonly userRepository: UserPersistence,
  ) {}
  async create(transaction: InputCreateTransactionDto): Promise<Transaction> {
    const usersFieldsExists = await this.validateFieldsUserOriginAndAddressee(
      transaction.userOrigin,
      transaction.userAddressee,
    );
    const walletsFieldsExists =
      await this.validateFieldsWalletOriginAndAddressee(
        transaction.walletOrigin,
        transaction.walletAddressee,
      );
    const checkBalance = await this.checkIfBalanceEnough(
      transaction.walletOrigin,
      transaction.value,
    );
    if (!usersFieldsExists) {
      throw new HttpException(
        'UserOrigin ou UserAdressee inválido',
        HttpStatus.CONFLICT,
      );
    }
    if (!walletsFieldsExists) {
      throw new HttpException(
        'WalletOrigin ou WalletAdressee inválido',
        HttpStatus.CONFLICT,
      );
    }
    if (!checkBalance) {
      throw new HttpException(
        'Saldo para a trasferência insuficiente',
        HttpStatus.CONFLICT,
      );
    }
    return await this.transactionRepository.save(
      new Transaction(
        uuid(),
        transaction.value,
        transaction.walletOrigin,
        transaction.walletAddressee,
        transaction.userOrigin,
        transaction.userAddressee,
      ),
    );
  }
  async findOne(id: string): Promise<Transaction> {
    const transactionFound = await this.transactionRepository.findOne(id);
    if (!transactionFound) {
      throw new HttpException(
        'Transaction não encontrado',
        HttpStatus.CONFLICT,
      );
    }
    return new Transaction(
      transactionFound.id,
      transactionFound.value,
      transactionFound.walletOrigin.id,
      transactionFound.walletAddressee.id,
      transactionFound.userOrigin.id,
      transactionFound.userAddressee.id,
    );
  }
  async validateFieldsUserOriginAndAddressee(
    userOrigin: string,
    userAddressee: string,
  ): Promise<boolean> {
    const userOriginExists = await this.userRepository.findOne(userOrigin);
    const userAddresseeExists = await this.userRepository.findOne(
      userAddressee,
    );

    if (!userOriginExists || !userAddresseeExists) {
      return false;
    }
    return true;
  }
  async validateFieldsWalletOriginAndAddressee(
    walletOrigin: string,
    walletAddressee: string,
  ): Promise<boolean> {
    const walletOriginExists = await this.walletRepository.findOne(
      walletOrigin,
    );
    const walletAddresseeExists = await this.walletRepository.findOne(
      walletAddressee,
    );

    if (!walletOriginExists || !walletAddresseeExists) {
      return false;
    }
    return true;
  }
  async checkIfBalanceEnough(id: string, value: number): Promise<boolean> {
    const wallet = await this.walletRepository.findOne(id);

    if (wallet.balance < value) {
      false;
    }
    return true;
  }
}