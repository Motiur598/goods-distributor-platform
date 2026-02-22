class QuantityHandler:
    @staticmethod
    def normalize_quantity(quantity_value: int, pieces_quantity: int, pieces_per_quantity: int):
        """
        Normalize quantity so that pieces_quantity < pieces_per_quantity.
        Example: 1 Dozen (12 pcs/doz) + 15 Pieces -> 2 Dozen + 3 Pieces.
        """
        if pieces_per_quantity <= 0:
            return quantity_value, pieces_quantity
            
        extra_type_qty = pieces_quantity // pieces_per_quantity
        remainder_pieces = pieces_quantity % pieces_per_quantity
        
        return quantity_value + extra_type_qty, remainder_pieces

    @staticmethod
    def total_pieces(quantity_value: int, pieces_quantity: int, pieces_per_quantity: int) -> int:
        return (quantity_value * pieces_per_quantity) + pieces_quantity

    @staticmethod
    def subtract_quantities(
        base_type_qty: int, base_piece_qty: int, 
        sub_type_qty: int, sub_piece_qty: int, 
        pieces_per_qty: int
    ):
        """
        Subtracts (sub_type_qty, sub_piece_qty) from (base_type_qty, base_piece_qty).
        Returns (result_type_qty, result_piece_qty).
        Handles borrowing if pieces are insufficient.
        """
        total_base = (base_type_qty * pieces_per_qty) + base_piece_qty
        total_sub = (sub_type_qty * pieces_per_qty) + sub_piece_qty
        
        remaining_total = total_base - total_sub
        
        if remaining_total < 0:
            raise ValueError("Insufficient stock")
            
        return remaining_total // pieces_per_qty, remaining_total % pieces_per_qty

    @staticmethod
    def calculate_weighted_average_price(
        current_total_pieces: int, current_avg_price: float,
        new_total_pieces: int, new_price_total: float
    ) -> float:
        """
        Calculate new average price per piece.
        current_avg_price is per piece or per type? 
        The prompt says 'Buy Price' column has 2 columns: 'per type rate' and 'per piece rate'.
        But internal storage should probably be per piece to make it easier.
        Let's store 'buy_price_avg' as per PIECE in the DB for simplicity, 
        but API might expose both.
        """
        if current_total_pieces + new_total_pieces == 0:
            return 0.0
            
        # Current total cost + New total cost
        total_cost = (current_total_pieces * current_avg_price) + new_price_total
        total_pieces = current_total_pieces + new_total_pieces
        
        return total_cost / total_pieces
