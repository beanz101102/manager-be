import { User } from "../models/user.entity";
import dataSource from "../database/data-source";
import { Contract } from "../models/contract.entity";
import { Like } from "typeorm";

let contractRepo = dataSource.getRepository(Contract);
class contractService {
  static async addContract(
    contractNumber: string,
    customerId: number,
    contractType: string,
    createdById: number,
    signersCount: number,
    status: string,
    note: string,
    pdfFilePath: string
  ): Promise<Contract> {
    const customer = await dataSource
      .getRepository(User)
      .findOneBy({ id: customerId });
    const createdBy = await dataSource
      .getRepository(User)
      .findOneBy({ id: createdById });

    if (!customer || !createdBy) {
      throw new Error("Customer or CreatedBy user not found");
    }

    let contract = new Contract();
    contract.contractNumber = contractNumber;
    contract.customer = customer;
    contract.contractType = contractType;
    contract.createdBy = createdBy;
    contract.signersCount = signersCount;
    contract.status = status;
    contract.note = note;
    contract.pdfFilePath = pdfFilePath;

    return await contractRepo.save(contract);
  }

  static async updateContract(
    id: any,
    contractNumber: any,
    customer: any,
    contractType: any,
    createdBy: User,
    signersCount: any,
    status: any,
    note: any
  ) {
    let contract = await contractRepo.findOneBy({ id: id });
    contract.contractNumber = contractNumber;
    contract.customer = customer;
    contract.contractType = contractType;
    contract.createdBy = createdBy;
    contract.signersCount = signersCount;
    contract.status = status;
    contract.note = note;
    await contractRepo.save(contract);
  }

  static async allContracts(
    contractNumber?: string,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;

    let query = {
      relations: ["customer", "createdBy"],
      where: {},
      skip: skip,
      take: limit,
    };

    if (contractNumber) {
      query.where = {
        contractNumber: Like(`%${contractNumber}%`),
      };
    }

    let [contracts, total] = await contractRepo.findAndCount(query);

    return contracts;
  }

  static async getDetail(id: any) {
    let contract = await contractRepo.findOne({
      relations: ["customer", "createdBy"],
      where: { id: id },
    });
    return contract;
  }
}

export default contractService;
