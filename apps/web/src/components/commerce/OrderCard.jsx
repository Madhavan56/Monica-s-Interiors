import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { price, fmtDate, fmtShort } from '../../lib/format.js';
import { reveal } from '../../lib/motion.js';
import { Button, StatusBadge } from '../ui/index.jsx';
import { ThumbArt } from './ProductArt.jsx';

/** Order card (design spec 3.4). */
export function OrderCard({ order, index = 0, onBuyAgain }) {
  const to = `/orders/${order.orderNumber}`;
  const closed = ['cancelled', 'returned', 'refunded', 'return_requested'].includes(order.status);
  let line;
  if (order.status === 'delivered') line = order.deliveredAt ? `Delivered ${fmtShort(order.deliveredAt)}` : 'Delivered';
  else if (closed) line = order.cancelReason || 'This order is closed.';
  else line = order.eta ? `Arriving ${fmtShort(order.eta)}` : 'Arrival date coming soon';

  return (
    <motion.article className="order-card" aria-labelledby={`o-${order.orderNumber}`} {...reveal(index)}>
      <div className="oc-head">
        <h2 id={`o-${order.orderNumber}`} className="tnum font-sans text-h4 font-semibold">#{order.orderNumber}</h2>
        <StatusBadge status={order.status} />
      </div>
      <p className="meta">
        Placed {fmtDate(order.placedAt)} · {order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {price(order.amounts.total)}
      </p>
      <div className="thumbs" role="img" aria-label={order.items.map((i) => i.name).join(', ')}>
        {order.items.slice(0, 4).map((i) => <ThumbArt key={i.productId} item={i} className="thumb [&>svg]:h-full [&>svg]:w-full" />)}
        {order.items.length > 4 && <div className="thumb more">+{order.items.length - 4}</div>}
      </div>
      <div className="oc-foot">
        <p className="body-sm min-w-[200px] flex-1 font-medium">
          {order.status === 'delayed' && <span className="text-warning">Delayed. </span>}
          {line}
        </p>
        <div className="oc-actions">
          {order.status === 'delivered' || closed ? (
            <>
              <Button as={Link} to={to} variant="tertiary">View details</Button>
              <Button onClick={() => onBuyAgain?.(order)}>Buy again</Button>
            </>
          ) : (
            <>
              <Button as={Link} to={to} variant="tertiary">View details</Button>
              <Button as={Link} to={to}>Track order</Button>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}
