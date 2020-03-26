import { Component, OnInit, Input, ChangeDetectionStrategy, OnChanges, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { StateService } from '../../services/state.service';
import { Observable, forkJoin } from 'rxjs';
import { Block, Outspend, Transaction } from '../../interfaces/electrs.interface';
import { ElectrsApiService } from '../../services/electrs-api.service';

@Component({
  selector: 'app-transactions-list',
  templateUrl: './transactions-list.component.html',
  styleUrls: ['./transactions-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionsListComponent implements OnInit, OnChanges {
  @Input() transactions: Transaction[];
  @Input() showConfirmations = false;
  @Input() transactionPage = false;

  @Output() loadMore = new EventEmitter();

  latestBlock$: Observable<Block>;
  outspends: Outspend[] = [];

  constructor(
    private stateService: StateService,
    private electrsApiService: ElectrsApiService,
    private ref: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    this.latestBlock$ = this.stateService.blocks$;
  }

  ngOnChanges() {
    if (!this.transactions || !this.transactions.length) {
      return;
    }
    const observableObject = {};
    this.transactions.forEach((tx, i) => {
      if (this.outspends[i]) {
        return;
      }
      observableObject[i] = this.electrsApiService.getOutspends$(tx.txid);
    });

    if (Object.keys(observableObject).length > 100) {
      console.log('Too many outspends requests');
      return;
    }

    forkJoin(observableObject)
      .subscribe((outspends: any) => {
        const newOutspends = [];
        for (const i in outspends) {
          if (outspends.hasOwnProperty(i)) {
            newOutspends.push(outspends[i]);
          }
        }
        this.outspends = this.outspends.concat(newOutspends);
        this.ref.markForCheck();
      });
  }

  onScroll() {
    this.loadMore.emit();
  }

  getTotalTxOutput(tx: any) {
    return tx.vout.map((v: any) => v.value || 0).reduce((a: number, b: number) => a + b);
  }

  switchCurrency() {
    const oldvalue = !this.stateService.viewFiat$.value;
    this.stateService.viewFiat$.next(oldvalue);
  }

  trackByFn(index: number, tx: Transaction) {
    return tx.txid + tx.status.confirmed;
  }
}
