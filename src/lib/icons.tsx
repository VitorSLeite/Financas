import {
  Banknote, Briefcase, CalendarDays, Car, ChevronRight, CircleDollarSign, Clapperboard,
  Coffee, CreditCard, Dumbbell, Fuel, Gamepad2, Gift, GraduationCap, HeartPulse,
  Home, Landmark, PieChart, PiggyBank, Plane, Receipt, Shirt, ShoppingBag, ShoppingCart,
  Smartphone, Sparkles, Stethoscope, Target, TrendingUp, UtensilsCrossed, Wallet, Wifi,
  Wrench, Zap, PawPrint, Baby, Music, Bus, Tag, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  calendar: CalendarDays,
  pieChart: PieChart,
  target: Target,
  banknote: Banknote,
  briefcase: Briefcase,
  car: Car,
  circleDollar: CircleDollarSign,
  clapper: Clapperboard,
  coffee: Coffee,
  creditCard: CreditCard,
  dumbbell: Dumbbell,
  fuel: Fuel,
  gamepad: Gamepad2,
  gift: Gift,
  graduation: GraduationCap,
  heartPulse: HeartPulse,
  home: Home,
  landmark: Landmark,
  piggy: PiggyBank,
  plane: Plane,
  receipt: Receipt,
  shirt: Shirt,
  shoppingBag: ShoppingBag,
  shoppingCart: ShoppingCart,
  smartphone: Smartphone,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  trendingUp: TrendingUp,
  utensils: UtensilsCrossed,
  wallet: Wallet,
  wifi: Wifi,
  wrench: Wrench,
  zap: Zap,
  paw: PawPrint,
  baby: Baby,
  music: Music,
  bus: Bus,
  tag: Tag,
  chevronRight: ChevronRight,
};

export const PICKER_ICONS = [
  "home", "utensils", "shoppingCart", "car", "fuel", "bus", "heartPulse",
  "stethoscope", "graduation", "clapper", "gamepad", "music", "plane",
  "shoppingBag", "shirt", "coffee", "smartphone", "wifi", "zap", "receipt",
  "wrench", "dumbbell", "gift", "paw", "baby", "briefcase", "banknote",
  "trendingUp", "piggy", "tag",
];

export const PALETTE = [
  "#00C9A7", "#2BD9BA", "#4DA3FF", "#5E7BD6", "#8B7CFF", "#A99CFF",
  "#FF5C6C", "#E0788A", "#F5B94A", "#7E8BA3", "#5B6880", "#A3AEC2",
];

export function DynIcon({
  name,
  size = 18,
  className,
  strokeWidth = 2.2,
}: {
  name?: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Cmp = (name && ICONS[name]) || Tag;
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} />;
}
